import AsyncStorage from '@react-native-async-storage/async-storage';
import signsData from '@/assets/signs.json';

export interface SignMetadata {
  classIndex: number;
  name: string;
  meaning: string;
  name_fr: string;
  meaning_fr: string;
  utterance_en: string;
  utterance_fr: string;
}

export type SignOverride = Partial<
  Pick<SignMetadata, 'name' | 'meaning' | 'name_fr' | 'meaning_fr' | 'utterance_en' | 'utterance_fr'>
>;

const OVERRIDES_KEY = '@signs/overrides';

let overridesCache: Record<number, SignOverride> = {};
let cacheLoaded = false;
const listeners = new Set<() => void>();

async function loadOverridesCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OVERRIDES_KEY);
    overridesCache = raw ? JSON.parse(raw) : {};
  } catch {
    overridesCache = {};
  }
  cacheLoaded = true;
  listeners.forEach((l) => l());
}

const initialLoad = loadOverridesCache();

/** Resolves once the overrides cache has loaded from disk at least once. */
export async function ensureSignOverridesLoaded(): Promise<void> {
  if (!cacheLoaded) await initialLoad;
}

export function subscribeToSignOverrides(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Merges the bundled sign metadata with any instructor override, synchronously. */
export function getSignMetadata(classIdx: number): SignMetadata | null {
  const base = signsData.find((s) => s.classIndex === classIdx);
  if (!base) return null;
  const override = overridesCache[classIdx];
  return override ? { ...base, ...override } : { ...base };
}

export function hasSignOverride(classIdx: number): boolean {
  return overridesCache[classIdx] != null;
}

export function getAllSignMetadata(): SignMetadata[] {
  return signsData
    .map((s) => getSignMetadata(s.classIndex))
    .filter((s): s is SignMetadata => s != null);
}

export async function setSignOverride(classIdx: number, override: SignOverride): Promise<void> {
  await ensureSignOverridesLoaded();
  overridesCache = { ...overridesCache, [classIdx]: { ...overridesCache[classIdx], ...override } };
  await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(overridesCache));
  listeners.forEach((l) => l());
}

export async function clearSignOverride(classIdx: number): Promise<void> {
  await ensureSignOverridesLoaded();
  const { [classIdx]: _removed, ...rest } = overridesCache;
  overridesCache = rest;
  await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(overridesCache));
  listeners.forEach((l) => l());
}

export async function clearSignOverrides(): Promise<void> {
  overridesCache = {};
  await AsyncStorage.removeItem(OVERRIDES_KEY);
  listeners.forEach((l) => l());
}