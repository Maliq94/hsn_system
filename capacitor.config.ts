import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hsn.fieldop',
  appName: 'HSN',
  webDir: 'public',
  server: {
    // UPDATED: Point to your PC's IP for physical phone testing
    // Ensure phone is on same Wi-Fi as 192.168.0.103
    url: 'http://192.168.0.103:3000/mobile',
    cleartext: true
  }
};

export default config;
