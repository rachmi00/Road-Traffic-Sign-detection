import { getSignMetadata } from '@/lib/signMetadata';
import { appendTripLogEntry, clearTripLogEntries } from '@/lib/tripLog';

export interface HistoryEntry {
  id: number;
  classIdx: number;
  confidence: number;
  timestamp: number;
}

let _entries: HistoryEntry[] = [];
let _idCounter = 0;
const _listeners = new Set<() => void>();

export function logDetection(classIdx: number, confidence: number): void {
  const now = Date.now();
  const last = _entries[0];
  if (last && last.classIdx === classIdx && now - last.timestamp < 8000) return;
  _entries = [
    { id: _idCounter++, classIdx, confidence, timestamp: now },
    ..._entries,
  ].slice(0, 100);
  _listeners.forEach((l) => l());

  // Mirrors detections into the persistent trip log read by Instructor Mode.
  const name = getSignMetadata(classIdx)?.name ?? `Class ${classIdx}`;
  appendTripLogEntry({ classIdx, name, timestamp: now, confidence }).catch(() => {});
}

export function getHistory(): HistoryEntry[] {
  return _entries;
}

export function clearHistory(): void {
  _entries = [];
  _listeners.forEach((l) => l());
  clearTripLogEntries().catch(() => {});
}

export function subscribeToHistory(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
