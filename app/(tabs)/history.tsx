import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  clearHistory,
  getHistory,
  subscribeToHistory,
  type HistoryEntry,
} from '@/store/detectionHistory';
import signsData from '../../assets/signs.json';

const CLASS_NAMES = [
  'Speed Limit 30', 'Speed Limit 50', 'Priority Road', 'Give Way', 'Stop',
  'No Entry', 'Road Work', 'Traffic Lights Ahead', 'Pedestrian Crossing',
  'Roundabout', 'No Parking',
];

const SIGN_COLORS: string[] = [
  '#D00020', '#D00020', '#E8890C', '#D00020', '#D00020',
  '#D00020', '#E8890C', '#E8890C', '#0A6EBD', '#0A6EBD', '#0A6EBD',
];

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function HistoryItem({ entry, now }: { entry: HistoryEntry; now: number }) {
  const name = CLASS_NAMES[entry.classIdx] ?? `Class ${entry.classIdx}`;
  const sign = signsData.find((s) => s.classIndex === entry.classIdx);
  const color = SIGN_COLORS[entry.classIdx] ?? '#888';
  const pct = Math.round(entry.confidence * 100);
  const elapsed = now - entry.timestamp;

  return (
    <View style={styles.item}>
      <View style={[styles.itemAccent, { backgroundColor: color }]} />
      <View style={styles.itemIcon}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Ionicons name="warning" size={16} color="#fff" />
        </View>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemName}>{name}</Text>
        {sign && (
          <Text style={styles.itemMeaning} numberOfLines={1}>
            {sign.meaning}
          </Text>
        )}
        <View style={styles.itemFooter}>
          <View style={styles.confBar}>
            <View style={[styles.confFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
          </View>
          <Text style={[styles.confLabel, { color }]}>{pct}%</Text>
          <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Ionicons name="car-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No signs logged yet</Text>
      <Text style={styles.emptyBody}>
        Open the Scanner tab, point the camera at traffic signs, and your trip history will appear here automatically.
      </Text>
      <View style={styles.emptyHint}>
        <Ionicons name="information-circle-outline" size={14} color="#8E8E93" />
        <Text style={styles.emptyHintText}>Signs are logged when confidence exceeds 70%</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [history, setHistory] = useState(getHistory());
  const [now, setNow] = useState(Date.now());

  useEffect(() => subscribeToHistory(() => setHistory(getHistory())), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.navHeader}>
        <View style={styles.navHeaderContent}>
          <Text style={styles.navTitle}>Trip Log</Text>
          <Text style={styles.navSubtitle}>
            {history.length > 0
              ? `${history.length} sign${history.length !== 1 ? 's' : ''} detected this session`
              : 'Current session'}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { clearHistory(); setHistory([]); }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#FF3B30" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <View style={styles.instructorBanner}>
            <Ionicons name="person-outline" size={14} color="#1C2E4A" />
            <Text style={styles.instructorText}>
              Instructor view — review every sign encountered during this drive
            </Text>
          </View>
          <FlatList
            data={history}
            keyExtractor={(e) => String(e.id)}
            renderItem={({ item }) => <HistoryItem entry={item} now={now} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  navHeader: {
    backgroundColor: '#1C2E4A',
    paddingTop: 58,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  navHeaderContent: { flex: 1 },
  navTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  navSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,59,48,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginLeft: 12,
  },
  clearBtnText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
  instructorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F0FE',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1C2E4A',
  },
  instructorText: { fontSize: 12, color: '#1C2E4A', fontWeight: '500', flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  separator: { height: 8 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  itemAccent: { width: 4 },
  itemIcon: { paddingTop: 16, paddingLeft: 14, paddingRight: 4 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: { flex: 1, paddingVertical: 14, paddingRight: 16, paddingLeft: 10 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 3 },
  itemMeaning: { fontSize: 12, color: '#8E8E93', marginBottom: 10, lineHeight: 16 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
    maxWidth: 100,
  },
  confFill: { height: '100%', borderRadius: 3 },
  confLabel: { fontSize: 12, fontWeight: '700', minWidth: 34 },
  elapsed: { fontSize: 11, color: '#C7C7CC', marginLeft: 'auto' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#3C3C43', marginTop: 20, marginBottom: 10 },
  emptyBody: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyHintText: { fontSize: 12, color: '#8E8E93' },
});
