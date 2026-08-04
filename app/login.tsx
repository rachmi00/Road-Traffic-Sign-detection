import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setRole } from '@/lib/auth';
import { InstructorPinModal } from '@/components/InstructorPinModal';

export default function LoginScreen() {
  const router = useRouter();
  const [pinModalVisible, setPinModalVisible] = useState(false);

  const chooseStudent = useCallback(async () => {
    try {
      await setRole('student');
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    }
  }, [router]);

  const openPinModal = useCallback(() => setPinModalVisible(true), []);
  const closePinModal = useCallback(() => setPinModalVisible(false), []);

  const handleVerified = useCallback(async () => {
    try {
      await setRole('instructor');
      setPinModalVisible(false);
      router.replace('/(instructor)');
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    }
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Traffic Sign Recognition</Text>
        <Text style={styles.subtitle}>Who&rsquo;s using the app?</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={chooseStudent}>
          <View style={[styles.cardIcon, { backgroundColor: '#0A6EBD' }]}>
            <Ionicons name="car-sport-outline" size={30} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I&rsquo;m a Driver</Text>
            <Text style={styles.cardSubtitle}>
              Scan signs, hear guidance, and track your drive.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={openPinModal}>
          <View style={[styles.cardIcon, { backgroundColor: '#1f3b66' }]}>
            <Ionicons name="school-outline" size={28} color="#fff" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>I&rsquo;m a Driving Instructor</Text>
            <Text style={styles.cardSubtitle}>
              Review trip logs, edit sign info, manage data.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Default instructor PIN: 1234 — change it inside Instructor Mode.
      </Text>

      <InstructorPinModal visible={pinModalVisible} onClose={closePinModal} onVerified={handleVerified} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },

  header: { paddingTop: 100, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  subtitle: { fontSize: 17, color: '#8E8E93', marginTop: 6 },

  cards: { gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    padding: 20,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  cardSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 3, lineHeight: 18 },

  footer: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    fontSize: 12,
    color: '#C7C7CC',
    textAlign: 'center',
    lineHeight: 17,
  },
});