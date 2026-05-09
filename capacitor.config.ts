import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hsn.fieldop',
  appName: 'HSN',
  webDir: 'public',
  server: {
    url: 'https://hsn-system-e265.vercel.app/mobile',
  }
};

export default config;
