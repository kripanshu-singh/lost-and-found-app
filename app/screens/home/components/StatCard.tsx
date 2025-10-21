import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette } from "../../../src/theme";

type StatCardProps = {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  palette: Palette;
  scheme: "light" | "dark";
};

export function StatCard({ label, value, icon, palette, scheme }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: palette.primarySoft },
        ]}
      >
        <Ionicons name={icon} size={28} color={palette.primary} />
      </View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
