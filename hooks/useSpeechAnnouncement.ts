import { useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';
import signsData from '../assets/signs.json';

const COOLDOWN_MS = 5000;

export function useSpeechAnnouncement() {
  const lastAnnounced = useRef<Map<number, number>>(new Map());

  const announce = useCallback((classIndex: number, lang: 'en' | 'fr') => {
    const now = Date.now();
    const lastTime = lastAnnounced.current.get(classIndex) ?? 0;
    if (now - lastTime < COOLDOWN_MS) return;

    const sign = signsData.find((s) => s.classIndex === classIndex);
    if (!sign) return;

    lastAnnounced.current.set(classIndex, now);
    Speech.stop();
    const utterance = lang === 'fr' ? sign.utterance_fr : sign.utterance_en;
    Speech.speak(utterance, { language: lang });
  }, []);

  return announce;
}
