import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type Role = 'student' | 'instructor';

const ROLE_KEY = '@auth/role';
const PIN_HASH_KEY = '@auth/instructor_pin_hash';
const DEFAULT_PIN = '1234';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function getRole(): Promise<Role | null> {
  const value = await AsyncStorage.getItem(ROLE_KEY);
  return value === 'student' || value === 'instructor' ? value : null;
}

export async function setRole(role: Role): Promise<void> {
  await AsyncStorage.setItem(ROLE_KEY, role);
}

export async function clearRole(): Promise<void> {
  await AsyncStorage.removeItem(ROLE_KEY);
}

/** Sets the instructor PIN to the default ("1234") the first time the app ever launches. */
export async function ensureInstructorPinInitialised(): Promise<void> {
  const existing = await AsyncStorage.getItem(PIN_HASH_KEY);
  if (existing == null) {
    await AsyncStorage.setItem(PIN_HASH_KEY, await hashPin(DEFAULT_PIN));
  }
}

export async function verifyInstructorPin(pin: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(PIN_HASH_KEY);
  if (!stored) return false;
  return (await hashPin(pin)) === stored;
}

export async function setInstructorPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(PIN_HASH_KEY, await hashPin(pin));
}
