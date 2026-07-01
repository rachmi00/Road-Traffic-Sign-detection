import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets } from 'react-native-worklets-core';
import { useSpeechAnnouncement } from '@/hooks/useSpeechAnnouncement';

const CLASS_NAMES = [
  'Speed Limit 30',
  'Speed Limit 50',
  'Priority Road',
  'Give Way',
  'Stop',
  'No Entry',
  'Road Work',
  'Traffic Lights Ahead',
  'Pedestrian Crossing',
  'Roundabout',
  'No Parking',
] as const;

const CONFIDENCE_THRESHOLD = 0.70;
const TTS_THRESHOLD = 0.70;
const MIN_BOX_SIZE = 0.05;
const IOU_THRESHOLD = 0.5;
const MAX_DETECTIONS = 5;

interface Detection {
  classIdx: number;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ModelMeta {
  numClasses: number;
  numDetections: number;
  transposed: boolean;
}

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [loading, setLoading] = useState(true);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isFocused = useIsFocused();
  const announce = useSpeechAnnouncement();

  const [appActive, setAppActive] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const cameraActive = isFocused && appActive;

  const [lang, setLang] = useState<'en' | 'fr'>('en');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const model = useTensorflowModel(require('../../assets/models/best.tflite'), []);
  const { resize } = useResizePlugin();

  const [resultStr, setResultStr] = useState('');
  const [diagStr, setDiagStr] = useState('');
  const [modelMeta, setModelMeta] = useState<ModelMeta | null>(null);

  const updateResult = Worklets.createRunOnJS(setResultStr);
  const updateDiag = Worklets.createRunOnJS(setDiagStr);

  useEffect(() => {
    if (model.state === 'loaded') {
      const shape = model.model.outputs[0].shape;
      const dim1 = shape[1];
      const dim2 = shape[2];
      const transposed = dim1 > dim2;
      const numDetections = transposed ? dim1 : dim2;
      const numCols = transposed ? dim2 : dim1;
      setModelMeta({ numClasses: numCols - 4, numDetections, transposed });
    }
  }, [model.state, model.model]);

  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
      setLoading(false);
    })();
  }, [hasPermission, requestPermission]);

  const { detections, debugInfo } = useMemo(() => {
    if (!resultStr) return { detections: [] as Detection[], debugInfo: '' };
    if (resultStr.startsWith('NONE|'))
      return { detections: [] as Detection[], debugInfo: `max: ${resultStr.split('|')[1]}` };
    if (resultStr.startsWith('ERR|'))
      return { detections: [] as Detection[], debugInfo: resultStr };

    const dets: Detection[] = [];
    for (const part of resultStr.split(';')) {
      const v = part.split(',');
      if (v.length >= 6) {
        dets.push({
          classIdx: parseInt(v[0], 10),
          confidence: parseFloat(v[1]),
          x: parseFloat(v[2]),
          y: parseFloat(v[3]),
          w: parseFloat(v[4]),
          h: parseFloat(v[5]),
        });
      }
    }
    const info =
      dets.length > 0
        ? `${dets.length} sign(s) · bbox: x${dets[0].x.toFixed(2)} y${dets[0].y.toFixed(2)} w${dets[0].w.toFixed(2)} h${dets[0].h.toFixed(2)}`
        : '';
    return { detections: dets, debugInfo: info };
  }, [resultStr]);

  // TTS only above 60%
  useEffect(() => {
    if (detections.length > 0) {
      const best = detections.reduce((a, b) => (b.confidence > a.confidence ? b : a));
      if (best.confidence >= TTS_THRESHOLD) announce(best.classIdx, lang);
    }
  }, [detections, announce, lang]);

  const actualModel = model.state === 'loaded' ? model.model : undefined;
  const boxedModel = useMemo(
    () => (actualModel != null ? NitroModules.box(actualModel) : undefined),
    [actualModel],
  );

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

        // Stage A diagnostic: dump first 30 values + length (runs every frame, read once then remove)
        const first30: number[] = [];
        for (let k = 0; k < 30 && k < output.length; k++) {
          first30.push(Math.round(output[k] * 10000) / 10000);
        }
        updateDiag(`len:${output.length}|${first30.join(',')}`);

        const candidates: {
          cls: number; conf: number;
          cx: number; cy: number; bw: number; bh: number;
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

        // Greedy NMS
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

        // Auto-detect coordinate format: if max coord > 2 → pixels (0-640), else normalized (0-1)
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
    [boxedModel, resize, modelMeta, updateResult, updateDiag],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Camera permission is required to detect traffic signs.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No back camera found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        frameProcessor={frameProcessor}
      />

      {/* Bounding boxes — model outputs square [0,1] coords, map to centered square on screen */}
      {detections.map((det, i) => {
        const squareSize = Math.min(screenW, screenH);
        const yOff = (screenH - squareSize) / 2;
        const left = det.x * squareSize;
        const top = det.y * squareSize + yOff;
        const width = det.w * squareSize;
        const height = det.h * squareSize;

        if (width < 10 || height < 10) return null;

        const clsName = CLASS_NAMES[det.classIdx] ?? `Class ${det.classIdx}`;
        const pct = Math.round(det.confidence * 100);

        return (
          <View key={i} pointerEvents="none">
            <View
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                borderWidth: 3,
                borderColor: '#00FF88',
                borderRadius: 6,
              }}
            />
            <View
              style={[
                styles.labelContainer,
                { left, top: Math.max(0, top - 26) },
              ]}
            >
              <Text style={styles.labelText}>
                {clsName} {pct}%
              </Text>
            </View>
          </View>
        );
      })}

      {/* Language toggle */}
      <TouchableOpacity
        style={styles.langToggle}
        onPress={() => setLang((l) => (l === 'en' ? 'fr' : 'en'))}
      >
        <Text style={styles.langText}>{lang === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}</Text>
      </TouchableOpacity>

      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>
          {model.state === 'loaded'
            ? '✓ Model ready'
            : model.state === 'error'
              ? '⚠ Model error'
              : '⏳ Loading model...'}
        </Text>
      </View>

      <View style={styles.bottomOverlay}>
        <Text style={styles.bigLabel}>
          {detections.length > 0
            ? `${CLASS_NAMES[detections[0].classIdx]} (${Math.round(detections[0].confidence * 100)}%)`
            : 'No sign detected'}
        </Text>
        <Text style={styles.smallLabel}>{debugInfo}</Text>
      </View>

      {/* Stage A diagnostic — verified: [1,15,8400] NCHW, normalized [0,1] coords */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1f3b66',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 260,
    alignItems: 'center',
  },
  bigLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smallLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  overlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  labelContainer: {
    position: 'absolute',
    backgroundColor: '#00FF88',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  labelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  langToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  diagOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 8,
    borderRadius: 6,
  },
  diagText: {
    color: '#0f0',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  langText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
