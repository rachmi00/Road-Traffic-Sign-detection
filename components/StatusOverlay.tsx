import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const top = detections[0];

  if (isLandscape) {
    // ── Landscape layout ────────────────────────────────────────────────
    // Compact horizontal panel at bottom-left so the road view is clear.
    return (
      <>
        {/* Model status — top-left */}
        <View style={styles.topOverlayLandscape}>
          <Text style={styles.overlayTextSmall}>
            {modelState === 'loaded' ? '✓ Ready' : modelState === 'error' ? '⚠ Error' : '⏳ Loading'}
          </Text>
        </View>

        {/* Language toggle — top-right */}
        <TouchableOpacity style={styles.langToggleLandscape} onPress={onToggleLang}>
          <Text style={styles.langTextSmall}>{lang === 'en' ? '🇬🇧' : '🇫🇷'}</Text>
        </TouchableOpacity>

        {/* Detection panel — bottom-left, horizontal */}
        <View style={[styles.detectionPanelLandscape, top != null && styles.detectionPanelActive]}>
          {top != null ? (
            <View style={styles.landscapeRow}>
              <View style={styles.detectionBadgeSmall}>
                <Text style={styles.detectionBadgeText}>✓</Text>
              </View>
              <View style={styles.landscapeInfo}>
                <Text style={styles.landscapeLabel} numberOfLines={1}>
                  {CLASS_NAMES[top.classIdx] ?? `Class ${top.classIdx}`}
                </Text>
                <View style={styles.landscapeConfRow}>
                  <View style={styles.confidenceBarSmall}>
                    <View style={[styles.confidenceFill, { width: `${Math.round(top.confidence * 100)}%` as `${number}%` }]} />
                  </View>
                  <Text style={styles.confidenceTextSmall}>{Math.round(top.confidence * 100)}%</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.noSignSmall}>
              {lang === 'en' ? 'No sign detected' : 'Aucun panneau'}
            </Text>
          )}
          {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
        </View>
      </>
    );
  }

  // ── Portrait layout (original) ─────────────────────────────────────────
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
  // ── Portrait ────────────────────────────────────────────────────────────
  langToggle: {
    position: 'absolute',
    top: 16,
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
    top: 16,
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
    bottom: 72,
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

  // ── Landscape ────────────────────────────────────────────────────────────
  topOverlayLandscape: {
    position: 'absolute',
    top: 12,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  overlayTextSmall: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  langToggleLandscape: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  langTextSmall: {
    fontSize: 16,
  },
  detectionPanelLandscape: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    backgroundColor: 'rgba(15,15,20,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 260,
  },
  detectionPanelActive: {
    borderColor: 'rgba(0,255,136,0.35)',
  },
  landscapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detectionBadgeSmall: {
    backgroundColor: '#00FF88',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  landscapeInfo: {
    flex: 1,
    gap: 4,
  },
  landscapeLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  landscapeConfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceBarSmall: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceTextSmall: {
    color: '#00FF88',
    fontSize: 12,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  noSignSmall: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
});
