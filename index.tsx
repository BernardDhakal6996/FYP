import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Object Detection</Text>
        <Text style={styles.subtitle}>
          Point your camera at objects to identify them
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Real-time Detection</Text>
          <Text style={styles.featureDescription}>
            Automatically scans for objects every 5 seconds
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Voice Feedback</Text>
          <Text style={styles.featureDescription}>
            Hear detected objects announced through text-to-speech
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Visual Results</Text>
          <Text style={styles.featureDescription}>
            See a list of detected objects with counts displayed on screen
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/camera')}
      >
        <Eye size={24} color="#FFFFFF" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Start Detection</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <Text style={styles.webNote}>
          Note: Camera functionality may be limited on web. For best experience, use a native app.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#BBBBBB',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#DDDDDD',
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webNote: {
    marginTop: 20,
    color: '#F97316',
    textAlign: 'center',
    fontSize: 14,
  },
});