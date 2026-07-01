import { useState } from 'react';
import { StyleSheet, Text, ScrollView, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import signsData from '../../assets/signs.json';

export default function InfoScreen() {
  const { classIndex } = useLocalSearchParams<{ classIndex?: string }>();
  const idx = classIndex != null ? parseInt(classIndex, 10) : null;
  const sign = idx != null ? signsData.find((s) => s.classIndex === idx) : null;

  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const isFr = lang === 'fr';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isFr ? 'Reconnaissance de Panneaux' : 'Traffic Sign Recognition'}
        </Text>
        <TouchableOpacity
          style={styles.langToggle}
          onPress={() => setLang((l) => (l === 'en' ? 'fr' : 'en'))}
        >
          <Text style={styles.langText}>{isFr ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
        </TouchableOpacity>
      </View>

      {sign != null ? (
        <View style={styles.card}>
          <Text style={styles.signName}>{isFr ? sign.name_fr : sign.name}</Text>

          <Text style={styles.sectionHeader}>
            {isFr ? 'Signification routière' : 'Highway Code Meaning'}
          </Text>
          <Text style={styles.paragraph}>{isFr ? sign.meaning_fr : sign.meaning}</Text>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              Speech.stop();
              const utterance = isFr ? sign.utterance_fr : sign.utterance_en;
              Speech.speak(utterance, { language: lang });
            }}
          >
            <Text style={styles.playButtonText}>
              🔊 {isFr ? 'Jouer Audio' : 'Play Audio'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.noSign}>
            {isFr ? 'Aucun panneau sélectionné' : 'No sign selected'}
          </Text>
          <Text style={styles.paragraph}>
            {isFr
              ? "Pointez la caméra vers un panneau de signalisation dans l'onglet Scanner. Une fois détecté, ses détails apparaîtront ici."
              : 'Point the camera at a traffic sign on the Scanner tab. Once detected, its details will appear here.'}
          </Text>
        </View>
      )}

      <Text style={styles.sectionHeader}>
        {isFr ? 'Tous les panneaux supportés' : 'All Supported Signs'}
      </Text>
      {signsData.map((s) => (
        <TouchableOpacity
          key={s.classIndex}
          style={styles.listItem}
          onPress={() => {
            Speech.stop();
            const utterance = isFr ? s.utterance_fr : s.utterance_en;
            Speech.speak(utterance, { language: lang });
          }}
        >
          <Text style={styles.listName}>{isFr ? s.name_fr : s.name}</Text>
          <Text style={styles.listMeaning}>{isFr ? s.meaning_fr : s.meaning}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f3b66',
    flex: 1,
  },
  langToggle: {
    backgroundColor: '#1f3b66',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  langText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },
  signName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f3b66',
    marginBottom: 8,
  },
  noSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    color: '#333',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  playButton: {
    marginTop: 16,
    backgroundColor: '#1f3b66',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f3b66',
    marginBottom: 4,
  },
  listMeaning: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});
