
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hckosice.app',
  appName: 'HC Kosice',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#050505",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;
