import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Detection } from './DetectionOverlay';

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

interface Props {
  modelState: string;
  detections: Detection[];
  debugInfo: string;
  lang: 'en' | 'fr';
  onToggleLang: () => void;
}

export function StatusOverlay({ modelState, detections, debugInfo, lang, onToggleLang }: Props) {
  const top = detections[0];

  return (
    <>
      <TouchableOpacity style={styles.langToggle} onPress={onToggleLang}>
        <Text style={styles.langText}>{lang === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}</Text>
      </TouchableOpacity>

      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>
          {modelState === 'loaded'
            ? '✓ Model ready'
            : modelState === 'error'
              ? '⚠ Model error'
              : '⏳ Loading model...'}
        </Text>
      </View>

      <View style={[styles.bottomOverlay, top != null && styles.bottomOverlayActive]}>
        {top != null ? (
          <>
            <View style={styles.detectionBadge}>
              <Text style={styles.detectionBadgeText}>DETECTED</Text>
            </View>
            <Text style={styles.bigLabel}>
              {CLASS_NAMES[top.classIdx] ?? `Class ${top.classIdx}`}
            </Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceBar}>
                <View
                  style={[styles.confidenceFill, { width: `${Math.round(top.confidence * 100)}%` as `${number}%` }]}
                />
              </View>
              <Text style={styles.confidenceText}>{Math.round(top.confidence * 100)}%</Text>
            </View>
          </>
        ) : (
          <Text style={styles.noSignLabel}>
            {lang === 'en' ? 'Point camera at a traffic sign' : 'Pointez la caméra vers un panneau'}
          </Text>
        )}
        {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  langToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  langText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  overlayText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,15,20,0.78)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    minWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bottomOverlayActive: {
    borderColor: 'rgba(0,255,136,0.35)',
  },
  detectionBadge: {
    backgroundColor: '#00FF88',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  detectionBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bigLabel: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBar: {
    width: 120,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 3,
  },
  confidenceText: {
    color: '#00FF88',
    fontSize: 13,
    fontWeight: '700',
  },
  noSignLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  debugText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 6,
  },
});
