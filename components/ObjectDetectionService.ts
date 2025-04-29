import * as Speech from 'expo-speech';
import axios from 'axios';

export interface DetectionResult {
  objects: Record<string, number>;
  imageUri?: string;
}

export class ObjectDetectionService {
  private serverUrl: string;
  private speakResults: boolean;
  private processingRef: { current: boolean };
  
  constructor(
    serverUrl: string = 'http://192.168.1.68:8000',
    speakResults: boolean = true
  ) {
    this.serverUrl = serverUrl;
    this.speakResults = speakResults;
    this.processingRef = { current: false };
  }
  
  public setServerUrl(url: string): void {
    this.serverUrl = url;
  }
  
  public setSpeakResults(speak: boolean): void {
    this.speakResults = speak;
  }
  
  public async checkServerStatus(): Promise<boolean> {
    try {
      await axios.get(`${this.serverUrl}/test/`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return true;
    } catch (err) {
      console.warn('Server connection failed:', err);
      return false;
    }
  }
  
  public speakDetectedObjects(objects: Record<string, number>): void {
    if (!this.speakResults) return;
    
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
  }
  
  public async detectObjects(photo: { uri: string }): Promise<DetectionResult> {
    if (this.processingRef.current) {
      return { objects: {} };
    }
    
    this.processingRef.current = true;
    
    try {
      const formData = new FormData();
      const fileToUpload = {
        uri: photo.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any;
      
      formData.append('file', fileToUpload);
      formData.append('tts', this.speakResults.toString());
      
      const response = await axios.post(`${this.serverUrl}/detect/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
      });
      
      const detectedHeader = response.headers['x-detected-objects'];
      if (detectedHeader) {
        try {
          const objects = JSON.parse(detectedHeader);
          if (this.speakResults) {
            this.speakDetectedObjects(objects);
          }
          return { objects, imageUri: photo.uri };
        } catch (e) {
          console.error('Error parsing detected objects:', e);
          if (this.speakResults) {
            Speech.speak("Error processing detection results", { rate: 1.0, pitch: 1.0 });
          }
          return { objects: {} };
        }
      } else {
        if (this.speakResults) {
          Speech.speak("No objects detected", { rate: 1.0, pitch: 1.0 });
        }
        return { objects: {} };
      }
      
    } catch (err) {
      console.error('Detection error:', err);
      if (this.speakResults) {
        Speech.speak("Error detecting objects", { rate: 1.0, pitch: 1.0 });
      }
      return { objects: {} };
    } finally {
      setTimeout(() => {
        this.processingRef.current = false;
      }, 2000);
    }
  }
}

export default new ObjectDetectionService();