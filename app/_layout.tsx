import { Stack } from "expo-router";
import "./global.css";
import { ThemeProvider } from "./theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="/screens/auth/Login" />
        <Stack.Screen name="/screens/auth/Register" />
      </Stack>
    </ThemeProvider>
  );
}
