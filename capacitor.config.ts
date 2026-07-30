import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.whitepine.dashboard',
  appName: 'White Pine Portal',
  webDir: 'public', // Revert back to public safely
  server: {
    url: 'https://white-pine-portal.vercel.app', // Points Capacitor straight to your live cloud matrix
    cleartext: true
  }
};

export default config;