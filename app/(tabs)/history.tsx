import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  clearHistory,
  getHistory,
  subscribeToHistory,
  type HistoryEntry,
} from '@/store/detectionHistory';
import signsData from '../../assets/signs.json';

const SIGN_IMAGES = [
  require('../../assets/signs/sign_1.png'),
  require('../../assets/signs/sign_1.png'),
  require('../../assets/signs/sign_2.png'),
  require('../../assets/signs/sign_3.png'),
  require('../../assets/signs/sign_4.png'),
  require('../../assets/signs/sign_5.png'),
  require('../../assets/signs/sign_6.png'),
  require('../../assets/signs/sign_7.png'),
  require('../../assets/signs/sign_8.png'),
  require('../../assets/signs/sign_9.png'),
  require('../../assets/signs/sign_10.png'),
];

const CLASS_NAMES = [
  'Speed Limit 30', 'Speed Limit 50', 'Priority Road', 'Give Way', 'Stop',
  'No Entry', 'Road Work', 'Traffic Lights Ahead', 'Pedestrian Crossing',
  'Roundabout', 'No Parking',
];

const SIGN_COLORS: string[] = [
  '#D00020', '#D00020', '#E8890C', '#D00020', '#D00020',
  '#D00020', '#E8890C', '#E8890C', '#0A6EBD', '#0A6EBD', '#0A6EBD',
];

const SIGN_ABBR = ['30', '50', '◆', '▽', 'ST', 'NE', '⚠', 'TL', 'PC', '↺', 'NP'];

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
  const abbr = SIGN_ABBR[entry.classIdx] ?? '?';
  const pct = Math.round(entry.confidence * 100);
  const elapsed = now - entry.timestamp;

  const img = SIGN_IMAGES[entry.classIdx];
  return (
    <View style={styles.item}>
      {img != null ? (
        <Image source={img} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Text style={styles.iconAbbr}>{abbr}</Text>
        </View>
      )}
      <View style={styles.itemBody}>
        <Text style={styles.itemName}>{name}</Text>
        {sign && (
          <Text style={styles.itemMeaning} numberOfLines={1}>
            {sign.meaning}
          </Text>
        )}
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.confLabel, { color }]}>{pct}%</Text>
        <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="car-outline" size={40} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>No signs detected yet</Text>
      <Text style={styles.emptyBody}>
        Open the Scanner tab and point the camera at traffic signs. Every detection above 70% confidence appears here.
      </Text>
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trip Log</Text>
          <Text style={styles.subtitle}>
            {history.length > 0
              ? `${history.length} sign${history.length !== 1 ? 's' : ''} this session`
              : 'Current session'}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { clearHistory(); setHistory([]); }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => <HistoryItem entry={item} now={now} />}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.instructorNote}>
              <Ionicons name="person-circle-outline" size={14} color="#8E8E93" />
              <Text style={styles.instructorText}>
                Instructor view · every sign detected this drive
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#fff',
    paddingTop: 62,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerText: { flex: 1 },
  title: { fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 3 },
  clearBtn: { marginLeft: 16, paddingVertical: 4 },
  clearBtnText: { fontSize: 16, color: '#FF3B30', fontWeight: '500' },

  instructorNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  instructorText: { fontSize: 13, color: '#8E8E93' },

  listContent: { paddingBottom: 48 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 74,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  iconImage: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconAbbr: { color: '#fff', fontSize: 13, fontWeight: '800' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  itemMeaning: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 2 },
  confLabel: { fontSize: 15, fontWeight: '700' },
  elapsed: { fontSize: 12, color: '#C7C7CC' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 44,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 10 },
  emptyBody: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
});
