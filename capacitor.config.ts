import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dadufood.app',
  appName: 'Dadu Food',
  webDir: 'dist',
  // Bundled build (option 2, user 28 Nov 01:52): the APK carries the web
  // code INSIDE it (dist/ copied into the app), so it opens offline and
  // feels like a real installed app. No server.url — the app loads its
  // bundled files first. Firebase (orders/login) still needs internet.
  // NOTE: a web update now needs a NEW APK build to reach app users.
};

export default config;
