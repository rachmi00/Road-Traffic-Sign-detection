import { StyleSheet, Text, ScrollView } from 'react-native';

export default function InfoScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Traffic Sign Recognition</Text>
      <Text style={styles.subtitle}>About This App</Text>
      <Text style={styles.paragraph}>
        This application uses your phone camera to detect and recognise road traffic signs in real
        time. When a sign is detected, the app draws a box around it on screen and announces the
        sign name aloud.
      </Text>
      <Text style={styles.subtitle}>Supported Signs</Text>
      <Text style={styles.paragraph}>
        The application currently recognises 10 sign categories common on Cameroonian roads
        including Stop, No Entry, Speed Limits, Give Way, Pedestrian Crossing, Road Works,
        Roundabout, Traffic Lights Ahead, and Priority Road.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f3b66',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
});