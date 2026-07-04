import { useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import { useSharedValue } from 'react-native-reanimated';
import type { ModelMeta } from './useModelSetup';

const CONFIDENCE_THRESHOLD = 0.5;
const MIN_BOX_SIZE = 0.05;
const IOU_THRESHOLD = 0.5;
const MAX_DETECTIONS = 5;
const FRAME_SKIP = 3;

// Module-level so Worklets.createRunOnJS gets a stable reference (no re-wrapping each render)
function _log(msg: string) {
  console.log('[TFLite]', msg);
}

export function useFrameInference(
  boxedModel: ReturnType<typeof import('react-native-nitro-modules').NitroModules.box> | undefined,
  modelMeta: ModelMeta | null,
  setResult: (str: string) => void,
) {
  const { resize } = useResizePlugin();
  const updateResult = Worklets.createRunOnJS(setResult);
  // Stable worklet→JS logger; useMemo with [] so it is created only once
  const logInference = useMemo(() => Worklets.createRunOnJS(_log), []);
  const frameCount = useSharedValue(0);
  const hasLogged = useSharedValue(false);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      frameCount.value = (frameCount.value + 1) % FRAME_SKIP;
      if (frameCount.value !== 0) return;

      if (boxedModel == null || modelMeta == null) return;

      const m = boxedModel.unbox();
      const { numClasses, numDetections, transposed } = modelMeta;

      try {
        const resized = resize(frame, {
          scale: { width: 640, height: 640 },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });

        const outputs = m.runSync([resized.buffer as ArrayBuffer]);
        const output = new Float32Array(outputs[0]);
        const numCols = 4 + numClasses;

        // Log output layout on first inference so we can verify [1,15,8400] vs [1,8400,15]
        if (!hasLogged.value) {
          hasLogged.value = true;
          let logStr = 'len=' + output.length + ' frame=' + frame.width + 'x' + frame.height + ' first30=[';
          for (let li = 0; li < Math.min(30, output.length); li++) {
            logStr += output[li].toFixed(3);
            if (li < 29) logStr += ',';
          }
          logStr += ']';
          logInference(logStr);
        }

        const candidates: {
          cls: number;
          conf: number;
          cx: number;
          cy: number;
          bw: number;
          bh: number;
        }[] = [];
        let maxScore = 0;

        for (let i = 0; i < numDetections; i++) {
          let boxBestClass = 0;
          let boxBestConf = 0;

          for (let c = 0; c < numClasses; c++) {
            const conf = transposed
              ? output[i * numCols + (4 + c)]
              : output[(4 + c) * numDetections + i];
            if (conf > boxBestConf) {
              boxBestConf = conf;
              boxBestClass = c;
            }
          }

          if (boxBestConf > maxScore) maxScore = boxBestConf;

          if (boxBestConf > CONFIDENCE_THRESHOLD) {
            const cx = transposed ? output[i * numCols] : output[i];
            const cy = transposed ? output[i * numCols + 1] : output[numDetections + i];
            const bw = transposed ? output[i * numCols + 2] : output[2 * numDetections + i];
            const bh = transposed ? output[i * numCols + 3] : output[3 * numDetections + i];
            if (bw > MIN_BOX_SIZE && bh > MIN_BOX_SIZE) {
              candidates.push({ cls: boxBestClass, conf: boxBestConf, cx, cy, bw, bh });
            }
          }
        }

        if (candidates.length === 0) {
          updateResult('NONE|' + maxScore.toFixed(4));
          return;
        }

        candidates.sort((a, b) => b.conf - a.conf);

        const kept: typeof candidates = [];
        const suppressed = new Set<number>();
        for (let i = 0; i < candidates.length && kept.length < MAX_DETECTIONS; i++) {
          if (suppressed.has(i)) continue;
          kept.push(candidates[i]);
          const a = candidates[i];
          const ax1 = a.cx - a.bw / 2;
          const ay1 = a.cy - a.bh / 2;
          const ax2 = a.cx + a.bw / 2;
          const ay2 = a.cy + a.bh / 2;
          for (let j = i + 1; j < candidates.length; j++) {
            if (suppressed.has(j)) continue;
            const b = candidates[j];
            const bx1 = b.cx - b.bw / 2;
            const by1 = b.cy - b.bh / 2;
            const bx2 = b.cx + b.bw / 2;
            const by2 = b.cy + b.bh / 2;
            const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
            const ih = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
            const inter = iw * ih;
            const union = a.bw * a.bh + b.bw * b.bh - inter;
            if (union > 0 && inter / union > IOU_THRESHOLD) suppressed.add(j);
          }
        }

        // Determine coordinate scale: model may output in [0,1] or [0,640] space
        let coordMax = 0;
        for (const d of kept) {
          if (d.cx > coordMax) coordMax = d.cx;
          if (d.cy > coordMax) coordMax = d.cy;
          if (d.bw > coordMax) coordMax = d.bw;
          if (d.bh > coordMax) coordMax = d.bh;
        }
        const scale = coordMax > 2 ? 640 : 1;

        // Letterbox padding introduced when the camera frame was scaled to 640×640.
        // The resize plugin fits the frame inside 640×640 maintaining aspect ratio,
        // padding the shorter axis with zeros. We must reverse this to get coordinates
        // relative to the actual camera frame (which the camera preview also shows).
        const fscale = Math.min(640 / frame.width, 640 / frame.height);
        const padX = (640 - frame.width * fscale) / 2 / 640;
        const padY = (640 - frame.height * fscale) / 2 / 640;
        // Guard against zero division if the frame happens to be exactly square
        const scaleX = padX < 0.499 ? 1 - 2 * padX : 1;
        const scaleY = padY < 0.499 ? 1 - 2 * padY : 1;

        const encoded = kept
          .map((d) => {
            // Step 1: normalize to [0,1] within the 640×640 letterboxed input
            const ncx = d.cx / scale;
            const ncy = d.cy / scale;
            const nw640 = d.bw / scale;
            const nh640 = d.bh / scale;

            // Step 2: remove letterbox padding → coordinates in original frame space [0,1]
            const upCx = (ncx - padX) / scaleX;
            const upCy = (ncy - padY) / scaleY;
            const upW  = nw640 / scaleX;
            const upH  = nh640 / scaleY;

            // Step 3: center → top-left, clamped to valid range
            const nx = Math.max(0, upCx - upW / 2);
            const ny = Math.max(0, upCy - upH / 2);
            const nw = Math.min(1 - nx, upW);
            const nh = Math.min(1 - ny, upH);

            return d.cls + ',' + d.conf.toFixed(3) + ',' + nx.toFixed(4) + ',' + ny.toFixed(4) + ',' + nw.toFixed(4) + ',' + nh.toFixed(4);
          })
          .join(';');

        updateResult(encoded);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        updateResult('ERR|' + msg);
      }
    },
    [boxedModel, resize, modelMeta, updateResult, logInference, frameCount, hasLogged],
  );

  return frameProcessor;
}
