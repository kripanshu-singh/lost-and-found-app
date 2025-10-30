module.exports = ({ config }) => {
  // Get environment variables
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
  const API_BASE_URL = process.env.API_BASE_URL || "http://192.168.29.123:8080";

  return {
    ...config,
    name: "Lost and Found",
    slug: "lost-and-found-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "lostandfoundapp",
    userInterfaceStyle: "automatic",
    extra: {
      apiBaseUrl: API_BASE_URL,
      router: {},
      eas: {
        projectId: "ef95ba73-0bbc-4c11-ad7f-50f9d1267458",
      },
    },
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "me.kripanshu.lostandfoundapp",
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json",
      package: "me.kripanshu.lostandfoundapp",
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
  };
};
