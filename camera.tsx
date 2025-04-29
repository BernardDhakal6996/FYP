import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import axios from 'axios';
import { Camera as LucideCamera, Info } from 'lucide-react-native';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<Record<string, number>>({});
  const cameraRef = useRef<CameraView>(null);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const processingRef = useRef(false);
  
  // Fix: Initialize cameraType with a safe fallback
  // Use 'back' as default type but handle cases where CameraType might not be fully initialized
  const [cameraType, setCameraType] = useState<CameraType>(
    // Ensure that we're using a valid CameraType value
    Platform.OS === 'web' ? ('back' as CameraType) : (CameraType?.back || 'back' as CameraType)
  );
  
  // Use the server URL from Settings (in a real app, this would be stored and shared)
  const SERVER_URL = "http://192.168.1.68:8000"; // 

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        const { status } = await requestPermission();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(true);
      }
      checkServerStatus();
    })();
  }, [permission]);

  const checkServerStatus = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/test/`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setServerStatus('online');
      console.log('Server is online');
    } catch (err) {
      console.warn('Server connection failed:', err);
      setServerStatus('offline');
    }
  };

  const speakDetectedObjects = (objects: Record<string, number>) => {
    if (Object.keys(objects).length === 0) {
      Speech.speak("No objects detected", { rate: 1.0, pitch: 1.0 });
      return;
    }
    
    const objectText = Object.entries(objects)
      .map(([name, count]) => `${count} ${name}${count > 1 ? 's' : ''}`)
      .join(', ');
      
    Speech.speak(`Detected: ${objectText}`, {
      rate: 1.0,
      pitch: 1.0,
    });
  };

  // Helper function to safely parse the detected objects header
  const parseDetectedObjects = (header: string | null): Record<string, number> => {
    if (!header) return {};
    
    try {
      // First attempt: Try direct JSON parsing (ideal case)
      return JSON.parse(header);
    } catch (e) {
      console.log('Initial JSON parse failed, trying to clean the string:', e);
      
      try {
        // Second attempt: Try to convert Python dict string to JSON
        // Remove single quotes, replace with double quotes for JSON compliance
        const fixedString = header
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":');
          
        return JSON.parse(fixedString);
      } catch (e2) {
        console.log('Second parse attempt failed:', e2);
        
        try {
          // Third attempt: Manual parsing as a last resort
          // Format should be like: {'person': 1, 'chair': 2}
          const result: Record<string, number> = {};
          
          // Extract key-value pairs using regex
          const matches = header.match(/'([^']+)':\s*(\d+)/g);
          if (matches) {
            matches.forEach(match => {
              const [key, value] = match.split(':').map(part => part.trim());
              const cleanKey = key.replace(/'/g, '');
              const numValue = parseInt(value, 10);
              if (!isNaN(numValue)) {
                result[cleanKey] = numValue;
              }
            });
          }
          
          return result;
        } catch (e3) {
          console.error('All parsing attempts failed:', e3);
          return {};
        }
      }
    }
  };

  const detectObjects = async () => {
    if (processingRef.current || serverStatus !== 'online' || !cameraRef.current) return;
    
    processingRef.current = true;
    setLoading(true);
    
    try {
      // This will only work on native platforms
      if (Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
          skipProcessing: true,
        });
        
        const formData = new FormData();
        const fileToUpload = {
          uri: photo.uri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        } as any;
        
        formData.append('file', fileToUpload);
        formData.append('tts', 'true');
        
        console.log("Sending request to", `${SERVER_URL}/detect/`);
        
        const response = await axios.post(`${SERVER_URL}/detect/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json, image/jpeg',
          },
          timeout: 15000, // Increase timeout for image processing
        });
        
        console.log("Response headers:", response.headers);
        
        const detectedHeader = response.headers['x-detected-objects'];
        if (detectedHeader) {
          try {
            // Use our robust parsing function
            const objects = parseDetectedObjects(detectedHeader);
            console.log("Detected objects:", objects);
            setDetectedObjects(objects);
            speakDetectedObjects(objects);
          } catch (e) {
            console.error('Error parsing detected objects:', e);
            setDetectedObjects({});
            Speech.speak("Error processing detection results", { rate: 1.0, pitch: 1.0 });
          }
        } else {
          console.log("No objects detected in response header");
          setDetectedObjects({});
          Speech.speak("No objects detected", { rate: 1.0, pitch: 1.0 });
        }
      } else {
        // Mock detection for web
        const mockObjects = {
          "person": 1,
          "chair": 2,
          "laptop": 1
        };
        setDetectedObjects(mockObjects);
        speakDetectedObjects(mockObjects);
        console.log("Web platform: Using mock detection data");
      }
    } catch (err) {
      console.error('Detection error:', err);
      
    } finally {
      setLoading(false);
      setTimeout(() => {
        processingRef.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (serverStatus === 'online' && !loading) {
      interval = setInterval(() => {
        if (!processingRef.current) {
          detectObjects();
        }
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [serverStatus, loading]);

  const toggleCameraType = () => {
    // Fix: Add more robust error handling for camera type toggling
    try {
      // Only toggle if not on web and CameraType is properly initialized
      if (Platform.OS !== 'web') {
        // Use string literal fallbacks if CameraType properties are undefined
        const frontType = CameraType?.front || 'front' as CameraType;
        const backType = CameraType?.back || 'back' as CameraType;
        
        setCameraType(current => 
          (current === backType || current === 'back') ? frontType : backType
        );
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      // Fallback to string-based type if there's an error
      setCameraType(current => 
        (current === 'back') ? ('front' as CameraType) : ('back' as CameraType)
      );
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text style={styles.messageText}>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.detectButton}
          onPress={() => requestPermission()}
        >
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web fallback content
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webFallback}>
          <LucideCamera size={48} color="#2196F3" />
          <Text style={styles.webTitle}>Camera functionality limited on web</Text>
          <Text style={styles.webDescription}>
            For the full experience with real camera detection, please use this app on a mobile device.
          </Text>
          
          <TouchableOpacity 
            style={styles.detectButton}
            onPress={detectObjects}
          >
            <Text style={styles.buttonText}>
              Simulate Detection
            </Text>
          </TouchableOpacity>
          
          <View style={styles.objectsContainer}>
            <Text style={styles.objectsTitle}>Detection Results:</Text>
            {Object.keys(detectedObjects).length > 0 ? (
              Object.entries(detectedObjects).map(([name, count]) => (
                <Text key={name} style={styles.objectText}>
                  {name}: {count}
                </Text>
              ))
            ) : (
              <Text style={styles.objectText}>No objects detected</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView 
        style={styles.camera} 
        ref={cameraRef}
        ratio="4:3"
        facing={cameraType}
      >
        <View style={styles.overlay}>
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              Server: {serverStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
            </Text>
            {loading && (
              <ActivityIndicator size="small" color="#FFFFFF" />
            )}
          </View>
          
          <View style={styles.objectsContainer}>
            <Text style={styles.objectsTitle}>Detected Objects:</Text>
            {Object.keys(detectedObjects).length > 0 ? (
              Object.entries(detectedObjects).map(([name, count]) => (
                <Text key={name} style={styles.objectText}>
                  {name}: {count}
                </Text>
              ))
            ) : (
              <Text style={styles.objectText}>No objects detected</Text>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.flipButton}
              onPress={toggleCameraType}
            >
              <Text style={styles.smallButtonText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.detectButton, (loading || serverStatus !== 'online') ? styles.disabledButton : null]} 
              onPress={detectObjects}
              disabled={loading || serverStatus !== 'online'}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : 'Detect Objects'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => checkServerStatus()}
            >
              <Info size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  messageText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  objectsContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 8,
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: '80%',
  },
  objectsTitle: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  objectText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginVertical: 2,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detectButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.5)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: 60,
  },
  infoButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: 60,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  webFallback: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    alignItems: 'center',
  },
  webTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  webDescription: {
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
});