import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { useSpeechAnnouncement } from '@/hooks/useSpeechAnnouncement';
import { useModelSetup } from '@/hooks/useModelSetup';
import { useFrameInference } from '@/hooks/useFrameInference';
import { DetectionOverlay } from '@/components/DetectionOverlay';
import { StatusOverlay } from '@/components/StatusOverlay';
import { logDetection } from '@/store/detectionHistory';
import type { Detection } from '@/components/DetectionOverlay';

const TTS_THRESHOLD = 0.6; // lowered: announce signs detected with ≥60% confidence in moving car

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
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [resultStr, setResultStr] = useState('');

  const [tfliteModel, setTfliteModel] = useState<TfliteModel | null>(null);
  const [modelState, setModelState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [modelError, setModelError] = useState('');

  useEffect(() => {
    // expo-asset resolves the bundled .tflite to a file:// URI in release builds.
    // Image.resolveAssetSource() (used by fast-tflite's require path) returns a
    // bare asset name without protocol in release APKs, causing MalformedURLException.
    Asset.loadAsync(require('../../assets/models/best.tflite'))
      .then(([asset]) => {
        if (!asset.localUri) throw new Error('Asset localUri unavailable');
        const uri = asset.localUri;
        // Try NNAPI (uses S22 Ultra NPU/DSP — 3–8× faster than CPU).
        // Fall back to CPU if the delegate rejects the model ops.
        return loadTensorflowModel({ url: uri }, ['nnapi'])
          .catch(() => loadTensorflowModel({ url: uri }, []));
      })
      .then((m) => {
        setTfliteModel(m);
        setModelState('loaded');
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setModelError(msg);
        setModelState('error');
        console.error('[TFLite] Load failed:', msg);
      });
  }, []);

  const { modelMeta, boxedModel } = useModelSetup(tfliteModel);
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

  if (modelState === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Model failed to load</Text>
        <ScrollView style={styles.errorBox}>
          <Text style={styles.errorMsg} selectable>{modelError || 'Unknown error'}</Text>
        </ScrollView>
        <Text style={styles.errorHint}>Screenshot this screen and share it.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={appActive}
          frameProcessor={frameProcessor}
        />
      )}
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
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  message: { color: 'white', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#1f3b66', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  errorTitle: { color: '#FF6B6B', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  errorBox: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
    width: '100%',
    marginBottom: 16,
  },
  errorMsg: { color: '#FF6B6B', fontSize: 12, fontFamily: 'monospace' },
  errorHint: { color: '#888', fontSize: 13, textAlign: 'center' },
});
