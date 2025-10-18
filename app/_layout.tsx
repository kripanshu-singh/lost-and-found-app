import Constants from "expo-constants";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthProvider";
import { ThemeProvider } from "../src/theme";
import "./global.css";

export default function RootLayout() {
  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === "storeClient";
    if (isExpoGo) {
      console.log(
        "[notifications] Remote push requires a development build (Expo Go not supported)",
      );
      return;
    }

    let isMounted = true;

    void import("expo-notifications")
      .then((Notifications) => {
        if (!isMounted) {
          return;
        }
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      })
      .catch((error) => {
        console.log("[notifications] Failed to configure handler", {
          error: error instanceof Error ? error.message : error,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="screens/auth/Login" />
            <Stack.Screen name="screens/home/Landing" />
            <Stack.Screen name="screens/home/ReportLostItem" />
            <Stack.Screen name="screens/home/CreateAlert" />
            <Stack.Screen name="screens/auth/Register" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
