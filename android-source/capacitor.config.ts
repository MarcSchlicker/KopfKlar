import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.kopfklar.app",
  appName: "KopfKlar",
  webDir: "android-web/dist",
  android: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_kopfklar",
      iconColor: "#126b9c",
    },
  },
};

export default config;
