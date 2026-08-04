import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <Ionicons name="car-sport" size={40} color="#1f3b66" />
        </View>
        <Text style={styles.appName}>Traffic Sign Recognition</Text>
        <Text style={styles.version}>Version {version}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student Driver</Text>
          <Text style={styles.cardBody}>
            Uses the Scanner tab to detect road signs in real time with spoken guidance, browses the Signs reference
            guide, and reviews their own Trip Log for the current session.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driving Instructor</Text>
          <Text style={styles.cardBody}>
            Supervises lessons from a separate, PIN-protected area. Reviews and exports Trip Logs, edits sign metadata
            used across the app, and manages locally stored data. Never uses the Scanner.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy</Text>
          <Text style={styles.cardBody}>
            Everything runs fully offline. Detections, trip logs, and sign edits are stored only on this device — no
            network calls, no cloud services, no analytics.
          </Text>
        </View>

        <Text style={styles.credit}>Traffic Sign Recognition — built with Expo, VisionCamera & TensorFlow Lite.</Text>
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

  scrollContent: { padding: 20, paddingBottom: 48, alignItems: 'center' },

  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  appName: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  version: { fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 24 },

  card: { width: '100%', backgroundColor: '#F2F2F7', borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#3C3C43', lineHeight: 20 },

  credit: { fontSize: 12, color: '#C7C7CC', textAlign: 'center', lineHeight: 18, marginTop: 12, paddingHorizontal: 20 },
});