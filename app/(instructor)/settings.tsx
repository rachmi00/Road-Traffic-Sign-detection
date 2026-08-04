import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { clearRole, setInstructorPin, verifyInstructorPin } from '@/lib/auth';
import { clearSignOverrides } from '@/lib/signMetadata';
import { clearHistory } from '@/store/detectionHistory';

type Section = 'pin' | 'reset' | null;

export default function InstructorSettingsScreen() {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<Section>(null);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  const [resetText, setResetText] = useState('');

  const toggleSection = useCallback((section: Section) => {
    setOpenSection((prev) => (prev === section ? null : section));
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setResetText('');
  }, []);

  const handleChangePin = useCallback(async () => {
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) {
      setPinError('Enter 4 digits in every field.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }
    setPinSaving(true);
    const ok = await verifyInstructorPin(currentPin);
    if (!ok) {
      setPinSaving(false);
      setPinError('Current PIN is incorrect.');
      return;
    }
    await setInstructorPin(newPin);
    setPinSaving(false);
    setOpenSection(null);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    Alert.alert('PIN updated', 'The Instructor PIN has been changed.');
  }, [currentPin, newPin, confirmPin]);

  const handleReset = useCallback(() => {
    clearHistory();
    clearSignOverrides();
    setOpenSection(null);
    setResetText('');
    Alert.alert('Data reset', 'Trip logs and sign edits have been cleared.');
  }, []);

  const handleLogOut = useCallback(() => {
    Alert.alert('Log out?', 'You will need to select a role again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await clearRole();
          router.replace('/login');
        },
      },
    ]);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>Security</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => toggleSection('pin')} activeOpacity={0.6}>
            <Ionicons name="keypad-outline" size={20} color="#1f3b66" />
            <Text style={styles.rowText}>Change PIN</Text>
            <Ionicons name={openSection === 'pin' ? 'chevron-up' : 'chevron-down'} size={16} color="#C7C7CC" />
          </TouchableOpacity>

          {openSection === 'pin' && (
            <View style={styles.expandBody}>
              <TextInput
                style={styles.input}
                placeholder="Current PIN"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={currentPin}
                onChangeText={(t) => setCurrentPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              />
              <TextInput
                style={styles.input}
                placeholder="New PIN"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={newPin}
                onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new PIN"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={confirmPin}
                onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              />
              {pinError !== '' && <Text style={styles.errorText}>{pinError}</Text>}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePin} disabled={pinSaving} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>{pinSaving ? 'Saving…' : 'Save new PIN'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => toggleSection('reset')} activeOpacity={0.6}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.rowText, styles.dangerText]}>Reset Application Data</Text>
            <Ionicons name={openSection === 'reset' ? 'chevron-up' : 'chevron-down'} size={16} color="#C7C7CC" />
          </TouchableOpacity>

          {openSection === 'reset' && (
            <View style={styles.expandBody}>
              <Text style={styles.warningText}>
                This clears all Trip Log entries and Sign Editor overrides. Roles and the Instructor PIN are kept. This
                cannot be undone.
              </Text>
              <Text style={styles.label}>Type RESET to confirm</Text>
              <TextInput
                style={styles.input}
                placeholder="RESET"
                placeholderTextColor="#C7C7CC"
                autoCapitalize="characters"
                autoCorrect={false}
                value={resetText}
                onChangeText={setResetText}
              />
              <TouchableOpacity
                style={[styles.dangerBtn, resetText !== 'RESET' && styles.disabledBtn]}
                onPress={handleReset}
                disabled={resetText !== 'RESET'}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerBtnText}>Reset Application Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Session</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogOut} activeOpacity={0.6}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.rowText, styles.dangerText]}>Log out</Text>
          </TouchableOpacity>
        </View>
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

  scrollContent: { padding: 20, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  card: { backgroundColor: '#F2F2F7', borderRadius: 14, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16 },
  rowText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1C1C1E' },
  dangerText: { color: '#FF3B30' },

  expandBody: { paddingHorizontal: 16, paddingBottom: 18, gap: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  label: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  warningText: { fontSize: 13, color: '#8E8E93', lineHeight: 19 },
  errorText: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },

  primaryBtn: { backgroundColor: '#1f3b66', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  dangerBtn: { backgroundColor: '#FF3B30', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  dangerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.4 },
});