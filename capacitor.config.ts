// Capacitor: the Android app wraps the web build (dist/, from npm run build).
// The appId is the app's name on the Play Store and never changes once published:
// confirm it before the first upload (step 5, the Android release).
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.krristouf.raclette',
  appName: 'Raclette Rush',
  webDir: 'dist',
  android: {
    backgroundColor: '#6fb2e6', // the sky, behind the game while it loads
  },
};

export default config;
