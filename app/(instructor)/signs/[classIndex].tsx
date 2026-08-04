import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ensureSignOverridesLoaded,
  getSignMetadata,
  hasSignOverride,
  setSignOverride,
  clearSignOverride,
  type SignMetadata,
  type SignOverride,
} from '@/lib/signMetadata';

const FIELDS: { key: keyof Omit<SignMetadata, 'classIndex'>; label: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Name (English)' },
  { key: 'name_fr', label: 'Name (French)' },
  { key: 'meaning', label: 'Meaning (English)', multiline: true },
  { key: 'meaning_fr', label: 'Meaning (French)', multiline: true },
  { key: 'utterance_en', label: 'Spoken utterance (English)' },
  { key: 'utterance_fr', label: 'Spoken utterance (French)' },
];

export default function SignEditScreen() {
  const router = useRouter();
  const { classIndex } = useLocalSearchParams<{ classIndex: string }>();
  const idx = parseInt(classIndex, 10);

  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureSignOverridesLoaded().then(() => {
      const meta = getSignMetadata(idx);
      if (meta) {
        setValues({
          name: meta.name,
          name_fr: meta.name_fr,
          meaning: meta.meaning,
          meaning_fr: meta.meaning_fr,
          utterance_en: meta.utterance_en,
          utterance_fr: meta.utterance_fr,
        });
        setEdited(hasSignOverride(idx));
      }
    });
  }, [idx]);

  const setField = (key: string, value: string) => setValues((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!values) return;
    setSaving(true);
    await setSignOverride(idx, values as SignOverride);
    setSaving(false);
    router.back();
  };

  const handleResetToDefault = () => {
    Alert.alert('Reset to default?', 'This discards your edits for this sign and restores the bundled text.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearSignOverride(idx);
          router.back();
        },
      },
    ]);
  };

  if (!values) return <View style={styles.container} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#0A6EBD" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {values.name}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={12}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {FIELDS.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              value={values[f.key]}
              onChangeText={(t) => setField(f.key, t)}
              style={[styles.input, f.multiline && styles.inputMultiline]}
              multiline={f.multiline}
              placeholder={f.label}
              placeholderTextColor="#C7C7CC"
            />
          </View>
        ))}

        {edited && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetToDefault} activeOpacity={0.7}>
            <Text style={styles.resetText}>Reset to bundled default</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: 62,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { width: 32 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#0A6EBD' },

  scrollContent: { padding: 20, paddingBottom: 48 },

  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  resetBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  resetText: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
});