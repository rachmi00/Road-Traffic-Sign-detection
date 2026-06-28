import { StyleSheet, Text, ScrollView, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import signsData from '../../assets/signs.json';

export default function InfoScreen() {
  const { classIndex } = useLocalSearchParams<{ classIndex?: string }>();
  const idx = classIndex != null ? parseInt(classIndex, 10) : null;
  const sign = idx != null ? signsData.find((s) => s.classIndex === idx) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Traffic Sign Recognition</Text>

      {sign != null ? (
        <View style={styles.card}>
          <Text style={styles.signName}>{sign.name}</Text>
          <Text style={styles.signNameFr}>{sign.name_fr}</Text>

          <Text style={styles.sectionHeader}>Highway Code Meaning</Text>
          <Text style={styles.paragraph}>{sign.meaning}</Text>

          <Text style={styles.sectionHeader}>Signification</Text>
          <Text style={styles.paragraph}>{sign.meaning_fr}</Text>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => {
              Speech.stop();
              Speech.speak(sign.utterance_en, { language: 'en' });
            }}
          >
            <Text style={styles.playButtonText}>🔊 Play Audio (EN)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, styles.playButtonFr]}
            onPress={() => {
              Speech.stop();
              Speech.speak(sign.utterance_fr, { language: 'fr' });
            }}
          >
            <Text style={styles.playButtonText}>🔊 Jouer Audio (FR)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.noSign}>No sign selected</Text>
          <Text style={styles.paragraph}>
            Point the camera at a traffic sign on the Scanner tab. Once detected,
            tap the sign name to see its details here.
          </Text>
        </View>
      )}

      <Text style={styles.sectionHeader}>All Supported Signs</Text>
      {signsData.map((s) => (
        <TouchableOpacity
          key={s.classIndex}
          style={styles.listItem}
          onPress={() => {
            Speech.stop();
            Speech.speak(s.utterance_en, { language: 'en' });
          }}
        >
          <Text style={styles.listName}>{s.name}</Text>
          <Text style={styles.listMeaning}>{s.meaning}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f3b66',
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
  },
  signNameFr: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
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
  playButtonFr: {
    marginTop: 8,
    backgroundColor: '#2e5a94',
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
