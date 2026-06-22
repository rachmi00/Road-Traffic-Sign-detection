import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { scheduleOnRN } from 'react-native-worklets';

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

const CONFIDENCE_THRESHOLD = 0.45;

interface ModelMeta {
  numClasses: number;
  numDetections: number;
  transposed: boolean;
}

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const model = useTensorflowModel(require('../../assets/models/best.tflite'), []);
  const { resize } = useResizePlugin();

  const [topDetection, setTopDetection] = useState<string | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [modelMeta, setModelMeta] = useState<ModelMeta | null>(null);

  useEffect(() => {
    console.log('[TFLite] Model state:', model.state);
    if (model.state === 'loaded') {
      const inputs = model.model.inputs;
      const outputs = model.model.outputs;
      console.log('[TFLite] Inputs:', JSON.stringify(inputs));
      console.log('[TFLite] Outputs:', JSON.stringify(outputs));

      const shape = outputs[0].shape;
      // shape is [1, C, D] or [1, D, C]
      // where C = 4 + numClasses, D = numDetections (typically 8400)
      const dim1 = shape[1];
      const dim2 = shape[2];
      const transposed = dim1 > dim2;
      const numDetections = transposed ? dim1 : dim2;
      const numCols = transposed ? dim2 : dim1;
      const numClasses = numCols - 4;

      const meta: ModelMeta = { numClasses, numDetections, transposed };
      setModelMeta(meta);
      console.log(
        `[TFLite] ${numClasses} classes, ${numDetections} detections, ` +
          `format=${transposed ? 'NHWC [1,D,C]' : 'NCHW [1,C,D]'}`,
      );
    }
  }, [model.state, model.model]);

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setLoading(false);
    })();
  }, [hasPermission, requestPermission]);

  const actualModel = model.state === 'loaded' ? model.model : undefined;

  // Box the Nitro HybridObject so VisionCamera v4 worklets can capture it
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
        // Resize camera frame → 640×640 RGB float32 normalised [0,1]
        const resized = resize(frame, {
          scale: { width: 640, height: 640 },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });

        const outputs = m.runSync([resized.buffer as ArrayBuffer]);
        const output = new Float32Array(outputs[0]);

        let bestConfidence = 0;
        let bestClassIdx = -1;
        let aboveThreshold = 0;
        const numCols = 4 + numClasses;

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

          if (boxBestConf > CONFIDENCE_THRESHOLD) {
            aboveThreshold++;
            if (boxBestConf > bestConfidence) {
              bestConfidence = boxBestConf;
              bestClassIdx = boxBestClass;
            }
          }
        }

        scheduleOnRN(setDetectionCount, aboveThreshold);
        if (bestClassIdx >= 0 && bestClassIdx < CLASS_NAMES.length) {
          const label = `${CLASS_NAMES[bestClassIdx]} (${Math.round(bestConfidence * 100)}%)`;
          scheduleOnRN(setTopDetection, label);
        } else {
          scheduleOnRN(setTopDetection, null);
        }
      } catch {
        // Inference error — silently ignore to avoid console spam
      }
    },
    [boxedModel, resize, modelMeta],
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
        isActive={true}
        frameProcessor={frameProcessor}
      />

      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>
          {model.state === 'loaded'
            ? '✓ Model ready'
            : model.state === 'error'
              ? '⚠ Placeholder model'
              : '⏳ Loading model...'}
        </Text>
      </View>

      <View style={styles.bottomOverlay}>
        <Text style={styles.bigLabel}>
          {topDetection ?? 'No sign detected'}
        </Text>
        <Text style={styles.smallLabel}>
          {detectionCount} candidate boxes above threshold
        </Text>
      </View>
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
    minWidth: 240,
    alignItems: 'center',
  },
  bigLabel: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  smallLabel: {
    color: '#bbb',
    fontSize: 12,
    marginTop: 4,
  },
  overlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
