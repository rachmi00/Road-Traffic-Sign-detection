import { useMemo } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import { useSharedValue } from 'react-native-reanimated';
import type { ModelMeta } from './useModelSetup';

const CONFIDENCE_THRESHOLD = 0.5;
// Lower bar used only to let a class survive into next-frame confirmation
// (see prevDetectedClasses below) — never treated as a confident detection
// on its own.
const MODERATE_CONFIDENCE_THRESHOLD = 0.3;
const MIN_BOX_SIZE = 0.05;
const IOU_THRESHOLD = 0.5;
const MAX_DETECTIONS = 5;
// Was 3 (process 1 in 3 camera frames). Dropped to 2 now that the coordinate
// transform bug is fixed — that bug wasn't a perf cost, but this is still an
// on-device tradeoff between detection latency and UI smoothness, so watch
// the periodic timing log below when testing at driving speed.
const FRAME_SKIP = 2;
const TIMING_LOG_INTERVAL = 15;

// Module-level so Worklets.createRunOnJS gets a stable reference (no re-wrapping each render)
function _log(msg: string) {
  console.log('[TFLite]', msg);
}

export function useFrameInference(
  boxedModel: ReturnType<typeof import('react-native-nitro-modules').NitroModules.box> | undefined,
  modelMeta: ModelMeta | null,
  setResult: (str: string) => void,
  screenW: number,
  screenH: number,
) {
  const { resize } = useResizePlugin();
  const updateResult = Worklets.createRunOnJS(setResult);
  // Stable worklet→JS logger; useMemo with [] so it is created only once
  const logInference = useMemo(() => Worklets.createRunOnJS(_log), []);
  const frameCount = useSharedValue(0);
  const hasLogged = useSharedValue(false);
  const timingCounter = useSharedValue(0);
  // Classes seen (at least MODERATE_CONFIDENCE_THRESHOLD) in the previous
  // processed frame, for cross-frame confidence smoothing.
  const prevDetectedClasses = useSharedValue<number[]>([]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      frameCount.value = (frameCount.value + 1) % FRAME_SKIP;
      if (frameCount.value !== 0) return;

      if (boxedModel == null || modelMeta == null) return;

      const m = boxedModel.unbox();
      const { numClasses, numDetections, transposed } = modelMeta;

      try {
        const t0 = Date.now();
        const resized = resize(frame, {
          scale: { width: 640, height: 640 },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });

        const outputs = m.runSync([resized.buffer as ArrayBuffer]);
        const t1 = Date.now();
        // Periodic (not per-frame) so the cross-thread log call itself doesn't
        // become a performance cost — reports actual resize+inference cost per
        // processed frame, to judge whether FRAME_SKIP can go lower still.
        timingCounter.value = (timingCounter.value + 1) % TIMING_LOG_INTERVAL;
        if (timingCounter.value === 0) {
          logInference('resize+inference took ' + (t1 - t0) + 'ms');
        }

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

          // Collected at the lower "moderate" bar so a class that's genuinely
          // present but under-confident this frame can still be confirmed via
          // prevDetectedClasses below; the full CONFIDENCE_THRESHOLD is applied
          // afterwards, per-candidate, not here.
          if (boxBestConf > MODERATE_CONFIDENCE_THRESHOLD) {
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
          prevDetectedClasses.value = [];
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

        // Cross-frame confidence smoothing: a detection below the normal
        // single-frame threshold is still accepted if the same class also
        // appeared (at at least moderate confidence) in the immediately
        // preceding processed frame. This catches signs that only briefly
        // cross the confidence bar at driving speed, without permanently
        // lowering the bar (which would raise false positives every frame).
        const prevClasses = prevDetectedClasses.value;
        const confirmed = kept.filter(
          (d) => d.conf > CONFIDENCE_THRESHOLD || prevClasses.indexOf(d.cls) !== -1
        );
        prevDetectedClasses.value = kept.map((d) => d.cls);

        if (confirmed.length === 0) {
          updateResult('NONE|' + maxScore.toFixed(4));
          return;
        }

        // Determine coordinate scale: model may output in [0,1] or [0,640] space
        let coordMax = 0;
        for (const d of confirmed) {
          if (d.cx > coordMax) coordMax = d.cx;
          if (d.cy > coordMax) coordMax = d.cy;
          if (d.bw > coordMax) coordMax = d.bw;
          if (d.bh > coordMax) coordMax = d.bh;
        }
        const scale = coordMax > 2 ? 640 : 1;

        // vision-camera-resize-plugin does NOT letterbox-pad when the target aspect
        // ratio differs from the frame's — per its own docs it performs a CENTER-CROP
        // to the target aspect ratio first (cutting off the longer axis), then scales,
        // "instead of being stretched". Our resize target is a 640×640 square, so the
        // crop takes a `min(frame.width, frame.height)`-sized square out of the center
        // of the raw sensor buffer.
        const bufCropSide = Math.min(frame.width, frame.height);
        const bufCropX = (frame.width - bufCropSide) / 2;
        const bufCropY = (frame.height - bufCropSide) / 2;

        // frame.width/frame.height are in the RAW SENSOR buffer's orientation, which
        // is rotated relative to the on-screen portrait UI whenever frame.orientation
        // isn't 'portrait' (confirmed via logging: this device reports 'landscape-right'
        // for a 640×480 buffer while held upright, i.e. the buffer's width axis is
        // actually the screen's vertical axis). A 90°/270° rotation swaps which raw
        // dimension becomes the "upright" width vs height.
        const isSideways = frame.orientation === 'landscape-left' || frame.orientation === 'landscape-right';
        const uprightW = isSideways ? frame.height : frame.width;
        const uprightH = isSideways ? frame.width : frame.height;

        // The Camera preview's default resizeMode is "cover": it scales the upright
        // frame up until it fills the screen on both axes, then center-crops the
        // overflow. We need to undo that crop too, or positions will be off by
        // however much of the upright frame is actually cropped off-screen.
        const coverScale = Math.max(screenW / uprightW, screenH / uprightH);
        const visibleWFrac = screenW / (uprightW * coverScale);
        const visibleHFrac = screenH / (uprightH * coverScale);
        const screenCropXFrac = (1 - visibleWFrac) / 2;
        const screenCropYFrac = (1 - visibleHFrac) / 2;

        const encoded = confirmed
          .map((d) => {
            // Step 1: normalize to [0,1] within the 640×640 model input (the cropped square)
            const ncx = d.cx / scale;
            const ncy = d.cy / scale;
            const nw = d.bw / scale;
            const nh = d.bh / scale;

            // Step 2: un-crop the model's square → center/size within the raw buffer, [0,1]
            const bufCx = (bufCropX + ncx * bufCropSide) / frame.width;
            const bufCy = (bufCropY + ncy * bufCropSide) / frame.height;
            const bufW = (nw * bufCropSide) / frame.width;
            const bufH = (nh * bufCropSide) / frame.height;

            // Step 3: rotate raw-buffer-space → upright (portrait-UI-relative) space
            let upCx: number, upCy: number, upW: number, upH: number;
            switch (frame.orientation) {
              case 'landscape-left': // buffer rotated +90°; counter-rotate -90° (CCW)
                upCx = bufCy; upCy = 1 - bufCx; upW = bufH; upH = bufW;
                break;
              case 'landscape-right': // buffer rotated +270°; counter-rotate +90° (CW)
                upCx = 1 - bufCy; upCy = bufCx; upW = bufH; upH = bufW;
                break;
              case 'portrait-upside-down':
                upCx = 1 - bufCx; upCy = 1 - bufCy; upW = bufW; upH = bufH;
                break;
              default: // 'portrait'
                upCx = bufCx; upCy = bufCy; upW = bufW; upH = bufH;
            }

            // Step 4: un-crop the preview's cover-fit → center/size within the screen, [0,1]
            const cx = (upCx - screenCropXFrac) / visibleWFrac;
            const cy = (upCy - screenCropYFrac) / visibleHFrac;
            const w = upW / visibleWFrac;
            const h = upH / visibleHFrac;

            // Step 5: center → top-left, clamped to the visible screen area
            const nx = Math.max(0, cx - w / 2);
            const ny = Math.max(0, cy - h / 2);
            const boxW = Math.min(1 - nx, w);
            const boxH = Math.min(1 - ny, h);

            return d.cls + ',' + d.conf.toFixed(3) + ',' + nx.toFixed(4) + ',' + ny.toFixed(4) + ',' + boxW.toFixed(4) + ',' + boxH.toFixed(4);
          })
          .join(';');

        updateResult(encoded);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        updateResult('ERR|' + msg);
      }
    },
    [
      boxedModel,
      resize,
      modelMeta,
      updateResult,
      logInference,
      frameCount,
      hasLogged,
      timingCounter,
      prevDetectedClasses,
      screenW,
      screenH,
    ],
  );

  return frameProcessor;
}
