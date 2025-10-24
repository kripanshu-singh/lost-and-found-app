import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Palette, useAppTheme } from "../src/theme";

export default function Index() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();

  const primaryOptions = useMemo(
    () => [
      {
        label: "Sign up with email",
        icon: "mail-outline",
        onPress: () => router.push("/screens/auth/Register"),
      },
    ],
    [router],
  );

  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={styles.container}>
        <View style={styles.heroArea}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.heroLogo}
            contentFit="contain"
          />
          <Text style={styles.heroTitle}>Lost &amp; Found</Text>
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.primaryButtonGroup}>
            {primaryOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[styles.actionButton, styles.primaryButton]}
                activeOpacity={0.9}
                onPress={option.onPress}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name={option.icon as any} size={20} color="#fff" />
                  <Text style={styles.primaryLabel}>{option.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            activeOpacity={0.9}
            onPress={() => router.push("/screens/auth/Login")}
          >
            <Text style={styles.secondaryLabel}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 24,
    },
    heroArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    heroLogo: {
      width: 132,
      height: 132,
      borderRadius: 24,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: palette.primaryStrong,
      letterSpacing: 0.25,
    },
    bottomSheet: {
      backgroundColor: palette.surface,
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      gap: 20,
      shadowColor: scheme === "dark" ? "#000" : palette.primarySoft,
      shadowOffset: { width: 0, height: -12 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.2,
      shadowRadius: 24,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 56,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.26)" : palette.border,
    },
    primaryButtonGroup: {
      gap: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 25,
      paddingVertical: 16,
      paddingHorizontal: 22,
    },
    actionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    primaryButton: {
      backgroundColor: palette.primary,
      borderRadius: 25,
      alignItems: "center",
    },
    primaryLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: scheme === "dark" ? palette.text : "#FFFFFF",
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(255,255,255,0.35)" : palette.border,
      backgroundColor: scheme === "dark" ? palette.background : palette.surface,
      borderRadius: 25,
      alignItems: "center",
    },
    secondaryLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
      color: scheme === "dark" ? palette.text : palette.primaryStrong,
    },
  });
}
