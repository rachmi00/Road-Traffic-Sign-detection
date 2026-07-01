import { useCallback, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import signsData from '../../assets/signs.json';

interface SignMeta {
  color: string;
  abbr: string;
  category: string;
}

const SIGN_META: SignMeta[] = [
  { color: '#D00020', abbr: '30', category: 'Speed Control' },
  { color: '#D00020', abbr: '50', category: 'Speed Control' },
  { color: '#E8890C', abbr: '◆',  category: 'Priority' },
  { color: '#D00020', abbr: '▽',  category: 'Yield & Stop' },
  { color: '#D00020', abbr: 'ST', category: 'Yield & Stop' },
  { color: '#D00020', abbr: 'NE', category: 'Prohibition' },
  { color: '#E8890C', abbr: '⚠',  category: 'Hazard' },
  { color: '#E8890C', abbr: 'TL', category: 'Hazard' },
  { color: '#0A6EBD', abbr: 'PC', category: 'Informational' },
  { color: '#0A6EBD', abbr: '↺',  category: 'Informational' },
  { color: '#0A6EBD', abbr: 'NP', category: 'Prohibition' },
];

const CATEGORIES = ['Speed Control', 'Yield & Stop', 'Priority', 'Prohibition', 'Hazard', 'Informational'];

const CATEGORY_FR: Record<string, string> = {
  'Speed Control': 'Contrôle de vitesse',
  'Yield & Stop': 'Cédez & Stop',
  'Priority': 'Priorité',
  'Prohibition': 'Interdiction',
  'Hazard': 'Danger',
  'Informational': 'Information',
};

function SignIcon({ classIdx, size = 44 }: { classIdx: number; size?: number }) {
  const meta = SIGN_META[classIdx] ?? { color: '#888', abbr: '?' };
  return (
    <View style={[styles.signIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: meta.color }]}>
      <Text style={[styles.signIconText, { fontSize: size <= 44 ? 13 : 20 }]}>{meta.abbr}</Text>
    </View>
  );
}

function SignRow({
  sign,
  isFr,
  expanded,
  onToggle,
}: {
  sign: (typeof signsData)[number];
  isFr: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = SIGN_META[sign.classIndex] ?? { color: '#888', abbr: '?', category: '' };
  const rotation = useState(() => new Animated.Value(0))[0];

  const handleToggle = useCallback(() => {
    Animated.spring(rotation, {
      toValue: expanded ? 0 : 1,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
    onToggle();
  }, [expanded, onToggle, rotation]);

  const chevronRotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View>
      <TouchableOpacity style={styles.rowHeader} onPress={handleToggle} activeOpacity={0.7}>
        <SignIcon classIdx={sign.classIndex} />
        <View style={styles.rowMeta}>
          <Text style={styles.rowName}>{isFr ? sign.name_fr : sign.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
            <Text style={[styles.catBadgeText, { color: meta.color }]}>
              {isFr ? (CATEGORY_FR[meta.category] ?? meta.category) : meta.category}
            </Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.rowBody, { borderTopColor: meta.color + '33' }]}>
          <Text style={styles.meaningText}>{isFr ? sign.meaning_fr : sign.meaning}</Text>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: meta.color }]}
            onPress={() => {
              Speech.stop();
              Speech.speak(isFr ? sign.utterance_fr : sign.utterance_en, { language: isFr ? 'fr' : 'en' });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="volume-high" size={16} color="#fff" />
            <Text style={styles.playBtnText}>{isFr ? 'Écouter' : 'Play Audio'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function InfoScreen() {
  const { classIndex } = useLocalSearchParams<{ classIndex?: string }>();
  const idx = classIndex != null ? parseInt(classIndex, 10) : null;
  const detectedSign = idx != null ? signsData.find((s) => s.classIndex === idx) : null;

  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const isFr = lang === 'fr';
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleExpand = useCallback((ci: number) => {
    setExpandedIdx((prev) => (prev === ci ? null : ci));
  }, []);

  return (
    <View style={styles.container}>
      {/* Navigation header */}
      <View style={styles.navHeader}>
        <View style={styles.navHeaderContent}>
          <Text style={styles.navTitle}>{isFr ? 'Panneaux routiers' : 'Traffic Signs'}</Text>
          <Text style={styles.navSubtitle}>
            {isFr ? `${signsData.length} panneaux supportés` : `${signsData.length} signs supported`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLang((l) => (l === 'en' ? 'fr' : 'en'))}
          activeOpacity={0.8}
        >
          <Text style={styles.langBtnText}>{isFr ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero card for last detected sign */}
        {detectedSign != null && (() => {
          const meta = SIGN_META[detectedSign.classIndex] ?? { color: '#888', abbr: '?', category: '' };
          return (
            <View style={[styles.heroCard, { backgroundColor: meta.color }]}>
              <View style={styles.heroTop}>
                <SignIcon classIdx={detectedSign.classIndex} size={60} />
                <View style={styles.heroText}>
                  <Text style={styles.heroCategory}>
                    {(isFr ? (CATEGORY_FR[meta.category] ?? meta.category) : meta.category).toUpperCase()}
                  </Text>
                  <Text style={styles.heroName}>{isFr ? detectedSign.name_fr : detectedSign.name}</Text>
                  <Text style={styles.heroMeaning} numberOfLines={2}>
                    {isFr ? detectedSign.meaning_fr : detectedSign.meaning}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.heroPlayBtn}
                activeOpacity={0.85}
                onPress={() => {
                  Speech.stop();
                  Speech.speak(isFr ? detectedSign.utterance_fr : detectedSign.utterance_en, {
                    language: isFr ? 'fr' : 'en',
                  });
                }}
              >
                <Ionicons name="volume-high" size={18} color={meta.color} />
                <Text style={[styles.heroPlayBtnText, { color: meta.color }]}>
                  {isFr ? 'Écouter la description' : 'Play description'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Grouped sign list */}
        {CATEGORIES.map((cat) => {
          const signs = signsData.filter((s) => (SIGN_META[s.classIndex]?.category ?? '') === cat);
          if (signs.length === 0) return null;
          const catColor = SIGN_META[signs[0].classIndex]?.color ?? '#888';
          return (
            <View key={cat} style={styles.section}>
              <View style={[styles.sectionHeader, { borderLeftColor: catColor }]}>
                <Text style={styles.sectionTitle}>
                  {isFr ? (CATEGORY_FR[cat] ?? cat) : cat}
                </Text>
              </View>
              <View style={styles.sectionCard}>
                {signs.map((sign, si) => (
                  <View key={sign.classIndex}>
                    {si > 0 && <View style={styles.divider} />}
                    <SignRow
                      sign={sign}
                      isFr={isFr}
                      expanded={expandedIdx === sign.classIndex}
                      onToggle={() => toggleExpand(sign.classIndex)}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.footer}>
          {isFr
            ? "Utilisez l'onglet Scanner pour reconnaître des panneaux en temps réel."
            : 'Use the Scanner tab to recognise signs in real time.'}
        </Text>
      </ScrollView>
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
  langBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 12,
  },
  langBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  heroText: { flex: 1 },
  heroCategory: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.2, marginBottom: 4 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 5 },
  heroMeaning: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroPlayBtnText: { fontSize: 15, fontWeight: '700' },
  section: { marginBottom: 22 },
  sectionHeader: { borderLeftWidth: 3, paddingLeft: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#3C3C43', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 74 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowMeta: { flex: 1, gap: 5 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  catBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  catBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  rowBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth },
  meaningText: { fontSize: 14, lineHeight: 21, color: '#636366', paddingTop: 12, marginBottom: 14 },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  playBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  signIcon: { justifyContent: 'center', alignItems: 'center' },
  signIconText: { color: '#fff', fontWeight: '800' },
  footer: { fontSize: 12, color: '#8E8E93', textAlign: 'center', lineHeight: 18, paddingTop: 8, paddingBottom: 8 },
});
