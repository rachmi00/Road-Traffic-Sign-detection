import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import type { ModelMeta } from './useModelSetup';

const CONFIDENCE_THRESHOLD = 0.7;
const MIN_BOX_SIZE = 0.05;
const IOU_THRESHOLD = 0.5;
const MAX_DETECTIONS = 5;

export function useFrameInference(
  boxedModel: ReturnType<typeof import('react-native-nitro-modules').NitroModules.box> | undefined,
  modelMeta: ModelMeta | null,
  setResult: (str: string) => void,
) {
  const { resize } = useResizePlugin();
  const updateResult = Worklets.createRunOnJS(setResult);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
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
          updateResult(`NONE|${maxScore.toFixed(4)}`);
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

        let coordMax = 0;
        for (const d of kept) {
          if (d.cx > coordMax) coordMax = d.cx;
          if (d.cy > coordMax) coordMax = d.cy;
          if (d.bw > coordMax) coordMax = d.bw;
          if (d.bh > coordMax) coordMax = d.bh;
        }
        const scale = coordMax > 2 ? 640 : 1;

        const encoded = kept
          .map((d) => {
            const nx = (d.cx - d.bw / 2) / scale;
            const ny = (d.cy - d.bh / 2) / scale;
            const nw = d.bw / scale;
            const nh = d.bh / scale;
            return `${d.cls},${d.conf.toFixed(3)},${nx.toFixed(4)},${ny.toFixed(4)},${nw.toFixed(4)},${nh.toFixed(4)}`;
          })
          .join(';');

        updateResult(encoded);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        updateResult(`ERR|${msg}`);
      }
    },
    [boxedModel, resize, modelMeta, updateResult],
  );

  return frameProcessor;
}
