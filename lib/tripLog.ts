import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TripLogEntry {
  classIdx: number;
  name: string;
  timestamp: number;
  confidence: number;
}

const TRIP_LOG_KEY = '@trip_log/current';

export async function getTripLogEntries(): Promise<TripLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(TRIP_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Detections of different classes can fire close together; without serializing
// writes, two overlapping read-modify-write cycles can race and silently drop
// an entry. Chaining every write through this queue keeps them ordered.
let writeQueue: Promise<void> = Promise.resolve();

export function appendTripLogEntry(entry: TripLogEntry): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const entries = await getTripLogEntries();
    entries.push(entry);
    await AsyncStorage.setItem(TRIP_LOG_KEY, JSON.stringify(entries));
  });
  return writeQueue;
}

export function clearTripLogEntries(): Promise<void> {
  writeQueue = writeQueue.then(() => AsyncStorage.removeItem(TRIP_LOG_KEY));
  return writeQueue;
}