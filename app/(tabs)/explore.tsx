import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { clearRole } from '@/lib/auth';
import { getAllSignMetadata, subscribeToSignOverrides, type SignMetadata } from '@/lib/signMetadata';

// sign_0.png doesn't exist — reuse sign_1 (Speed Limit 50) as the closest match
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

function SignIcon({ classIdx, size = 42 }: { classIdx: number; size?: number }) {
  const img = SIGN_IMAGES[classIdx];
  if (img != null) {
    return <Image source={img} style={{ width: size, height: size }} resizeMode="contain" />;
  }
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
  sign: SignMetadata;
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
      <TouchableOpacity style={styles.rowHeader} onPress={handleToggle} activeOpacity={0.6}>
        <SignIcon classIdx={sign.classIndex} />
        <Text style={styles.rowName}>{isFr ? sign.name_fr : sign.name}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.rowBody}>
          <Text style={styles.meaningText}>{isFr ? sign.meaning_fr : sign.meaning}</Text>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: meta.color + '12' }]}
            onPress={() => {
              Speech.stop();
              Speech.speak(isFr ? sign.utterance_fr : sign.utterance_en, { language: isFr ? 'fr' : 'en' });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-high" size={15} color={meta.color} />
            <Text style={[styles.playBtnText, { color: meta.color }]}>
              {isFr ? 'Écouter' : 'Play audio'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function InfoScreen() {
  const router = useRouter();
  const { classIndex } = useLocalSearchParams<{ classIndex?: string }>();
  const idx = classIndex != null ? parseInt(classIndex, 10) : null;

  const [signs, setSigns] = useState<SignMetadata[]>(getAllSignMetadata());
  useEffect(() => subscribeToSignOverrides(() => setSigns(getAllSignMetadata())), []);

  const detectedSign = idx != null ? signs.find((s) => s.classIndex === idx) : null;

  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const isFr = lang === 'fr';
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleExpand = useCallback((ci: number) => {
    setExpandedIdx((prev) => (prev === ci ? null : ci));
  }, []);

  const handleLogOut = useCallback(async () => {
    try {
      await clearRole();
      router.replace('/login');
    } catch (e) {
      Alert.alert('Could not log out', e instanceof Error ? e.message : String(e));
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{isFr ? 'Panneaux routiers' : 'Traffic Signs'}</Text>
          <Text style={styles.subtitle}>
            {isFr ? `${signs.length} panneaux supportés` : `${signs.length} signs supported`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLang((l) => (l === 'en' ? 'fr' : 'en'))}
          activeOpacity={0.7}
        >
          <Text style={styles.langBtnText}>{isFr ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero card for last detected sign */}
        {detectedSign != null && (() => {
          const meta = SIGN_META[detectedSign.classIndex] ?? { color: '#888', abbr: '?', category: '' };
          return (
            <View style={[styles.heroCard, { backgroundColor: meta.color }]}>
              <View style={styles.heroRow}>
                <SignIcon classIdx={detectedSign.classIndex} size={56} />
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
                activeOpacity={0.8}
                onPress={() => {
                  Speech.stop();
                  Speech.speak(isFr ? detectedSign.utterance_fr : detectedSign.utterance_en, {
                    language: isFr ? 'fr' : 'en',
                  });
                }}
              >
                <Ionicons name="volume-high" size={16} color={meta.color} />
                <Text style={[styles.heroPlayBtnText, { color: meta.color }]}>
                  {isFr ? 'Écouter la description' : 'Play description'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Sign list — flat, no cards */}
        {CATEGORIES.map((cat) => {
          const categorySigns = signs.filter((s) => (SIGN_META[s.classIndex]?.category ?? '') === cat);
          if (categorySigns.length === 0) return null;
          return (
            <View key={cat} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isFr ? (CATEGORY_FR[cat] ?? cat) : cat}
              </Text>
              {categorySigns.map((sign, si) => (
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
          );
        })}

        <Text style={styles.footer}>
          {isFr
            ? "Utilisez l'onglet Scanner pour reconnaître des panneaux en temps réel."
            : 'Use the Scanner tab to recognise signs in real time.'}
        </Text>

        <TouchableOpacity style={styles.logOutBtn} onPress={handleLogOut} activeOpacity={0.6}>
          <Ionicons name="log-out-outline" size={15} color="#C7C7CC" />
          <Text style={styles.logOutText}>Log out</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerText: { flex: 1 },
  title: { fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 3 },
  langBtn: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 14,
  },
  langBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },

  scrollContent: { paddingBottom: 48 },

  heroCard: {
    margin: 20,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  heroText: { flex: 1 },
  heroCategory: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.2, marginBottom: 4 },
  heroName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 5 },
  heroMeaning: { fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 18 },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroPlayBtnText: { fontSize: 15, fontWeight: '600' },

  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 76,
  },

  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    gap: 14,
  },
  rowName: { flex: 1, fontSize: 17, fontWeight: '400', color: '#1C1C1E' },

  rowBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F0',
  },
  meaningText: { fontSize: 15, lineHeight: 22, color: '#3C3C43', paddingTop: 12, marginBottom: 16 },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  playBtnText: { fontSize: 14, fontWeight: '600' },

  signIcon: { justifyContent: 'center', alignItems: 'center' },
  signIconText: { color: '#fff', fontWeight: '800' },

  footer: {
    fontSize: 13,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 8,
  },

  logOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
  },
  logOutText: { fontSize: 13, color: '#C7C7CC', fontWeight: '500' },
});
