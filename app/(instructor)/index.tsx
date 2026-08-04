import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { clearHistory } from '@/store/detectionHistory';
import { getTripLogEntries, type TripLogEntry } from '@/lib/tripLog';
import { exportTripLog, type ExportFormat } from '@/lib/tripLogExport';

// Same set used by the Student Trip Log tab — sign_0.png doesn't exist, so index 0
// reuses sign_1 (Speed Limit 50) as the closest match.
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

const SIGN_COLORS: string[] = [
  '#D00020', '#D00020', '#E8890C', '#D00020', '#D00020',
  '#D00020', '#E8890C', '#E8890C', '#0A6EBD', '#0A6EBD', '#0A6EBD',
];

function TripLogItem({ entry }: { entry: TripLogEntry }) {
  const color = SIGN_COLORS[entry.classIdx] ?? '#888';
  const pct = Math.round(entry.confidence * 100);
  const img = SIGN_IMAGES[entry.classIdx];

  return (
    <View style={styles.item}>
      {img != null ? (
        <Image source={img} style={styles.iconImage} resizeMode="contain" />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: color }]} />
      )}
      <View style={styles.itemBody}>
        <Text style={styles.itemName}>{entry.name}</Text>
        <Text style={styles.itemTime}>{new Date(entry.timestamp).toLocaleString()}</Text>
      </View>
      <Text style={[styles.confLabel, { color }]}>{pct}%</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="clipboard-outline" size={40} color="#C7C7CC" />
      </View>
      <Text style={styles.emptyTitle}>No detections recorded</Text>
      <Text style={styles.emptyBody}>
        Once a Student Driver completes a drive with the Scanner tab, their detections will appear here for review.
      </Text>
    </View>
  );
}

export default function TripReviewScreen() {
  const [entries, setEntries] = useState<TripLogEntry[] | null>(null);
  const [exportVisible, setExportVisible] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const refresh = useCallback(() => {
    getTripLogEntries().then(setEntries);
  }, []);

  useFocusEffect(refresh);

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear trip log?',
      'This permanently deletes every recorded detection for the current session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            setEntries([]);
          },
        },
      ]
    );
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!entries || entries.length === 0) {
        setExportVisible(false);
        return;
      }
      setExporting(format);
      try {
        await exportTripLog(entries, format);
      } catch {
        Alert.alert('Export failed', 'Could not generate the file. Please try again.');
      } finally {
        setExporting(null);
        setExportVisible(false);
      }
    },
    [entries]
  );

  const list = entries ?? [];
  const chronological = [...list].reverse();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Trip Review</Text>
          <Text style={styles.subtitle}>
            {list.length > 0 ? `${list.length} detection${list.length !== 1 ? 's' : ''} this session` : 'Current session'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setExportVisible(true)} activeOpacity={0.7}>
            <Text style={styles.headerBtnText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleClear} activeOpacity={0.7}>
            <Text style={[styles.headerBtnText, styles.clearText]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entries === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#8E8E93" />
        </View>
      ) : chronological.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={chronological}
          keyExtractor={(e, i) => `${e.timestamp}-${i}`}
          renderItem={({ item }) => <TripLogItem entry={item} />}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={exportVisible} transparent animationType="fade" onRequestClose={() => setExportVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setExportVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Export Trip Log</Text>
            {(['pdf', 'csv', 'txt'] as ExportFormat[]).map((format) => (
              <TouchableOpacity
                key={format}
                style={styles.sheetOption}
                onPress={() => handleExport(format)}
                activeOpacity={0.6}
                disabled={exporting != null}
              >
                <Ionicons
                  name={format === 'pdf' ? 'document-text-outline' : format === 'csv' ? 'grid-outline' : 'reader-outline'}
                  size={20}
                  color="#1f3b66"
                />
                <Text style={styles.sheetOptionText}>{format.toUpperCase()}</Text>
                {exporting === format && <ActivityIndicator size="small" color="#8E8E93" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setExportVisible(false)} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerActions: { flexDirection: 'row', gap: 16 },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { fontSize: 16, color: '#0A6EBD', fontWeight: '500' },
  clearText: { color: '#FF3B30' },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingBottom: 48 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 74 },

  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 14 },
  iconImage: { width: 42, height: 42, flexShrink: 0 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, flexShrink: 0 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  itemTime: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  confLabel: { fontSize: 15, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 44, paddingBottom: 80 },
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

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20 },
  sheetTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F0F0' },
  sheetOptionText: { fontSize: 17, color: '#1C1C1E', fontWeight: '500' },
  sheetCancel: { marginTop: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12 },
  sheetCancelText: { fontSize: 16, color: '#1C1C1E', fontWeight: '600' },
});