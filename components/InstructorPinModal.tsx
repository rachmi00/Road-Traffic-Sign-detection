import { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { verifyInstructorPin } from '@/lib/auth';

interface Props {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function InstructorPinModal({ visible, onClose, onVerified }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const focusInput = useCallback(() => {
    // Modal's onShow can fire before the native input has finished laying out on Android,
    // which makes an imperative .focus() silently no-op — a short delay makes it reliable.
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    onClose();
  }, [onClose]);

  const submitPin = useCallback(
    async (candidate: string) => {
      if (candidate.length !== 4) return;
      setChecking(true);
      try {
        const ok = await verifyInstructorPin(candidate);
        if (ok) {
          setPin('');
          onVerified();
        } else {
          setError('Incorrect PIN');
          setPin('');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPin('');
      } finally {
        setChecking(false);
      }
    },
    [onVerified]
  );

  const onChangePin = useCallback(
    (value: string) => {
      const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
      setPin(digits);
      setError('');
      if (digits.length === 4) submitPin(digits);
    },
    [submitPin]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} onShow={focusInput}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Enter Instructor PIN</Text>
          <Text style={styles.modalSubtitle}>4-digit PIN</Text>

          <TouchableOpacity style={styles.dotsRowWrapper} activeOpacity={1} onPress={focusInput}>
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
              ))}
            </View>
            <TextInput
              ref={inputRef}
              value={pin}
              onChangeText={onChangePin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              style={styles.hiddenInput}
              editable={!checking}
            />
          </TouchableOpacity>

          {error !== '' && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#1C1C1E' },
  modalSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 4 },

  dotsRowWrapper: { position: 'relative', paddingVertical: 16, marginTop: 12 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
  },
  dotFilled: { backgroundColor: '#1f3b66', borderColor: '#1f3b66' },

  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0 },

  errorText: { color: '#FF3B30', fontSize: 14, fontWeight: '600', marginTop: 16 },

  cancelBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: '#8E8E93', fontSize: 15, fontWeight: '500' },
});