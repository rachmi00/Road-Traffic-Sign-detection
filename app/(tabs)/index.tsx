import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

export default function ScannerScreen() {
  // Manages whether the user has granted camera permission
  const { hasPermission, requestPermission } = useCameraPermission();

  // Picks the back camera of the phone
  const device = useCameraDevice('back');

  // Track if we are still loading permission state
  const [loading, setLoading] = useState(true);

  // When the screen first opens, ask for camera permission if not yet granted
  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setLoading(false);
    })();
  }, [hasPermission, requestPermission]);

  // While we figure out permissions, show a loading screen
  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Loading camera...</Text>
      </View>
    );
  }

  // If user denied permission, show a message and a button to try again
  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera permission is required to detect traffic signs.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If no back camera is available (unlikely but possible)
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No back camera found on this device.</Text>
      </View>
    );
  }

  // All good — show the live camera preview
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />
      {/* A small overlay at the top showing the app is running */}
      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>Scanner Active</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1f3b66',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  overlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});