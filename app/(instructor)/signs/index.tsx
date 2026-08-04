import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ensureSignOverridesLoaded,
  getAllSignMetadata,
  hasSignOverride,
  type SignMetadata,
} from '@/lib/signMetadata';

const SIGN_COLORS: string[] = [
  '#D00020', '#D00020', '#E8890C', '#D00020', '#D00020',
  '#D00020', '#E8890C', '#E8890C', '#0A6EBD', '#0A6EBD', '#0A6EBD',
];

const SIGN_ABBR = ['30', '50', '◆', '▽', 'ST', 'NE', '⚠', 'TL', 'PC', '↺', 'NP'];

export default function SignEditorListScreen() {
  const router = useRouter();
  const [signs, setSigns] = useState<SignMetadata[]>([]);

  useFocusEffect(
    useCallback(() => {
      ensureSignOverridesLoaded().then(() => setSigns(getAllSignMetadata()));
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sign Editor</Text>
        <Text style={styles.subtitle}>{signs.length} sign categories</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {signs.map((sign, i) => {
          const color = SIGN_COLORS[sign.classIndex] ?? '#888';
          const abbr = SIGN_ABBR[sign.classIndex] ?? '?';
          const edited = hasSignOverride(sign.classIndex);
          return (
            <View key={sign.classIndex}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => router.push(`/(instructor)/signs/${sign.classIndex}`)}
              >
                <View style={[styles.iconCircle, { backgroundColor: color }]}>
                  <Text style={styles.iconAbbr}>{abbr}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{sign.name}</Text>
                  {edited && <Text style={styles.editedBadge}>Edited</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.footer}>
          Edits apply immediately to the Student Signs tab and future Scanner announcements.
        </Text>
      </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: { fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 3 },

  scrollContent: { paddingBottom: 48 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 76 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 14 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  iconAbbr: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 17, color: '#1C1C1E' },
  editedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f3b66',
    backgroundColor: '#1f3b6614',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },

  footer: { fontSize: 13, color: '#C7C7CC', textAlign: 'center', lineHeight: 18, paddingHorizontal: 40, paddingTop: 28 },
});