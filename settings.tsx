import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Volume2, Bell, Server, Clock, RefreshCw } from 'lucide-react-native';
import axios from 'axios';

export default function SettingsScreen() {
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [serverUrl, setServerUrl] = useState('http://192.168.1.68:8000');
  const [detectInterval, setDetectInterval] = useState('5');
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Check server status when the screen loads or when URL changes
  useEffect(() => {
    checkServerStatus();
  }, [serverUrl]);

  const checkServerStatus = async () => {
    setServerStatus('unknown');
    try {
      const response = await axios.get(`${serverUrl}/test/`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setServerStatus('online');
    } catch (err) {
      console.warn('Server connection failed:', err);
      setServerStatus('offline');
    }
  };

  const testVoice = () => {
    Speech.speak('Voice feedback is working correctly', {
      rate: 1.0,
      pitch: 1.0,
    });
  };

  const saveSettings = () => {
    // In a real app, we would persist these settings
    Alert.alert(
      'Settings Saved',
      'Your settings have been saved successfully.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detection Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Server size={20} color="#2196F3" style={styles.icon} />
            <Text style={styles.settingLabel}>Server URL</Text>
          </View>
          <View style={styles.serverInputContainer}>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="Enter server URL"
              placeholderTextColor="#666"
            />
            <TouchableOpacity 
              style={[styles.statusIndicator, 
                serverStatus === 'online' ? styles.statusOnline : 
                serverStatus === 'offline' ? styles.statusOffline : 
                styles.statusUnknown
              ]}
              onPress={checkServerStatus}
            >
              <Text style={styles.statusIndicatorText}>
                {serverStatus === 'online' ? '🟢' : 
                 serverStatus === 'offline' ? '🔴' : '⚪'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <RefreshCw size={20} color="#2196F3" style={styles.icon} />
            <Text style={styles.settingLabel}>Auto-Detection</Text>
          </View>
          <Switch
            value={autoDetect}
            onValueChange={setAutoDetect}
            trackColor={{ false: '#444', true: '#2196F3' }}
            thumbColor={autoDetect ? '#FFF' : '#f4f3f4'}
          />
        </View>
        
        {autoDetect && (
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Clock size={20} color="#2196F3" style={styles.icon} />
              <Text style={styles.settingLabel}>Detection Interval (seconds)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.smallInput]}
              value={detectInterval}
              onChangeText={(text) => setDetectInterval(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibility</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Volume2 size={20} color="#2196F3" style={styles.icon} />
            <Text style={styles.settingLabel}>Voice Feedback</Text>
          </View>
          <Switch
            value={voiceFeedback}
            onValueChange={setVoiceFeedback}
            trackColor={{ false: '#444', true: '#2196F3' }}
            thumbColor={voiceFeedback ? '#FFF' : '#f4f3f4'}
          />
        </View>
        
        {voiceFeedback && (
          <TouchableOpacity style={styles.testButton} onPress={testVoice}>
            <Text style={styles.testButtonText}>Test Voice</Text>
          </TouchableOpacity>
        )}
        
        {Platform.OS !== 'web' && (
          <View style={styles.settingItem}>
            <View style={styles.settingLabelContainer}>
              <Bell size={20} color="#2196F3" style={styles.icon} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#444', true: '#2196F3' }}
              thumbColor={notifications ? '#FFF' : '#f4f3f4'}
            />
          </View>
        )}
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
      
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Object Detection v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2025 All Rights Reserved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  section: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#DDDDDD',
  },
  serverInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  input: {
    backgroundColor: '#333',
    color: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
    flex: 1,
  },
  smallInput: {
    width: 60,
    textAlign: 'center',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusOnline: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  statusUnknown: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusIndicatorText: {
    fontSize: 12,
  },
  testButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  versionText: {
    color: '#666',
    fontSize: 14,
  },
  copyrightText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});