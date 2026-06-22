import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { scheduleOnRN } from 'react-native-worklets';

// Class names in the EXACT order the model was trained on.
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

const CONFIDENCE_THRESHOLD = 0.5;
const NUM_DETECTIONS = 8400;
const NUM_CLASSES = 11;

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const model = useTensorflowModel(require('../../assets/models/best.tflite'), []);

  const [detectionCount, setDetectionCount] = useState(0);
  const [topDetection, setTopDetection] = useState<string | null>(null);

  useEffect(() => {
    console.log('[TFLite] Model state:', model.state);
  }, [model.state]);

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setLoading(false);
    })();
  }, [hasPermission, requestPermission]);

  const actualModel = model.state === 'loaded' ? model.model : undefined;

  // ─────────────────────────────────────────────────────────────────────
  // FRAME OUTPUT — VisionCamera v5 API (replaces v4 useFrameProcessor)
  // onFrame runs as a worklet on the camera's native thread.
  // ─────────────────────────────────────────────────────────────────────
  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    targetResolution: { width: 640, height: 640 },
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';

      if (actualModel != null) {
        try {
          // Get raw RGB bytes from the frame (zero-copy GPU → CPU download)
          const pixelBuffer = frame.getPixelBuffer();
          const src = new Uint8Array(pixelBuffer);

          // Normalise uint8 [0–255] → float32 [0–1] as YOLOv8 expects
          const dst = new Float32Array(src.length);
          for (let i = 0; i < src.length; i++) {
            dst[i] = src[i] / 255.0;
          }

          // Run YOLOv8 inference
          const outputs = actualModel.runSync([dst.buffer]);
          const output = new Float32Array(outputs[0] as unknown as ArrayBuffer);

          let bestConfidence = 0;
          let bestClassIdx = -1;
          let detectionsAboveThreshold = 0;

          // YOLO NCHW output layout: index = channel * NUM_DETECTIONS + anchor
          // Channels 0–3 = cx,cy,w,h  |  channels 4–14 = class scores
          for (let i = 0; i < NUM_DETECTIONS; i++) {
            let boxBestClass = 0;
            let boxBestConf = 0;
            for (let c = 0; c < NUM_CLASSES; c++) {
              const conf = output[(4 + c) * NUM_DETECTIONS + i];
              if (conf > boxBestConf) {
                boxBestConf = conf;
                boxBestClass = c;
              }
            }
            if (boxBestConf > CONFIDENCE_THRESHOLD) {
              detectionsAboveThreshold++;
              if (boxBestConf > bestConfidence) {
                bestConfidence = boxBestConf;
                bestClassIdx = boxBestClass;
              }
            }
          }

          scheduleOnRN(setDetectionCount, detectionsAboveThreshold);
          if (bestClassIdx >= 0) {
            const label = `${CLASS_NAMES[bestClassIdx]} (${Math.round(bestConfidence * 100)}%)`;
            scheduleOnRN(setTopDetection, label);
          } else {
            scheduleOnRN(setTopDetection, null);
          }
        } catch {
          // inference errors are silent — model may still be warming up
        }
      }

      // Must always dispose to avoid stalling the camera pipeline
      frame.dispose();
    },
  });

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
        <Text style={styles.message}>Camera permission is required to detect traffic signs.</Text>
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
      {/* Pass frameOutput via outputs[] — VisionCamera v5 API */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />

      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>
          {model.state === 'loaded' ? '✓ Model ready' : '⏳ Loading model...'}
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
