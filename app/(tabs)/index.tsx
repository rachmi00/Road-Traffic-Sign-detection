import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useSpeechAnnouncement } from '@/hooks/useSpeechAnnouncement';
import { useModelSetup } from '@/hooks/useModelSetup';
import { useFrameInference } from '@/hooks/useFrameInference';
import { DetectionOverlay } from '@/components/DetectionOverlay';
import { StatusOverlay } from '@/components/StatusOverlay';
import { logDetection } from '@/store/detectionHistory';
import type { Detection } from '@/components/DetectionOverlay';

const TTS_THRESHOLD = 0.7;

export default function ScannerScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
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
  const [resultStr, setResultStr] = useState('');

  const { modelState, modelMeta, boxedModel } = useModelSetup();
  const frameProcessor = useFrameInference(boxedModel, modelMeta, setResultStr);

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
        ? `${dets.length} sign(s) · ${dets[0].w.toFixed(2)}×${dets[0].h.toFixed(2)}`
        : '';
    return { detections: dets, debugInfo: info };
  }, [resultStr]);

  useEffect(() => {
    if (detections.length > 0) {
      const best = detections.reduce((a, b) => (b.confidence > a.confidence ? b : a));
      if (best.confidence >= TTS_THRESHOLD) {
        announce(best.classIdx, lang);
        logDetection(best.classIdx, best.confidence);
      }
    }
  }, [detections, announce, lang]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const toggleLang = useCallback(() => setLang((l) => (l === 'en' ? 'fr' : 'en')), []);

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
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        frameProcessor={frameProcessor}
        fps={15}
      />
      <DetectionOverlay detections={detections} screenW={screenW} screenH={screenH} />
      <StatusOverlay
        modelState={modelState}
        detections={detections}
        debugInfo={debugInfo}
        lang={lang}
        onToggleLang={toggleLang}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
});
