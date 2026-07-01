import { View, Text, StyleSheet } from 'react-native';

export interface Detection {
  classIdx: number;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  detections: Detection[];
  screenW: number;
  screenH: number;
}

export function DetectionOverlay({ detections, screenW, screenH }: Props) {
  return (
    <>
      {detections.map((det, i) => {
        const left = det.x * screenW;
        const top = det.y * screenH;
        const width = det.w * screenW;
        const height = det.h * screenH;

        if (width < 10 || height < 10) return null;

        const clsName = CLASS_NAMES[det.classIdx] ?? `Class ${det.classIdx}`;
        const pct = Math.round(det.confidence * 100);

        return (
          <View key={i} pointerEvents="none">
            <View style={[styles.box, { left, top, width, height }]} />
            <View style={[styles.labelContainer, { left, top: Math.max(0, top - 28) }]}>
              <Text style={styles.labelText}>
                {clsName} {pct}%
              </Text>
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#00FF88',
    borderRadius: 6,
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
});
