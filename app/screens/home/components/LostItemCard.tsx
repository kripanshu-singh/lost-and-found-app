import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import {
  type ItemCategory,
  type LostItemSummary,
} from "../../../../src/api/items";
import { type Palette } from "../../../../src/theme";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521208914987-3eab03c06a61?auto=format&fit=crop&w=600&q=80";

type LostItemCardProps = {
  item: LostItemSummary;
  palette: Palette;
  scheme: "light" | "dark";
  onPress?: (event: GestureResponderEvent) => void;
};

function formatCategoryLabel(category: ItemCategory): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveDisplayImage(images: string[]): string {
  if (!images || images.length === 0) {
    return FALLBACK_IMAGE;
  }

  const candidate = images.find((uri) => isProbablyImageUri(uri)) ?? images[0];
  return isProbablyImageUri(candidate) ? candidate : FALLBACK_IMAGE;
}

function isProbablyImageUri(uri: string): boolean {
  if (!uri) {
    return false;
  }

  const lower = uri.toLowerCase();
  if (!lower.startsWith("http")) {
    return false;
  }

  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic"];
  return imageExtensions.some((ext) => lower.includes(ext));
}

function formatFoundDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LostItemCard({
  item,
  palette,
  scheme,
  onPress,
}: LostItemCardProps) {
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const imageUri = useMemo(
    () => resolveDisplayImage(item.images),
    [item.images],
  );
  const categoryLabel = useMemo(
    () => formatCategoryLabel(item.category),
    [item.category],
  );
  const foundDateLabel = useMemo(
    () => formatFoundDate(item.dateFound) ?? "Date unknown",
    [item.dateFound],
  );

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.thumbnail}
        contentFit="cover"
      />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.itemName}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText} numberOfLines={1}>
              {item.status.toLowerCase() === "available"
                ? "Available"
                : item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.metaText} numberOfLines={1}>
          {categoryLabel} • {foundDateLabel}
        </Text>
        {item.locationFound ? (
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={palette.textSecondary}
              style={styles.locationIcon}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.locationFound}
            </Text>
          </View>
        ) : null}
        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: palette.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    thumbnail: {
      width: 84,
      height: 84,
      borderRadius: 8,
      backgroundColor: palette.surface,
    },
    body: {
      flex: 1,
      justifyContent: "space-between",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor:
        scheme === "dark"
          ? "rgba(133, 187, 101, 0.25)"
          : "rgba(55, 125, 34, 0.12)",
      borderWidth: 1,
      borderColor:
        scheme === "dark"
          ? "rgba(133, 187, 101, 0.4)"
          : "rgba(55, 125, 34, 0.25)",
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
      color: scheme === "dark" ? "#8ecf80" : "#377d22",
      textTransform: "capitalize",
    },
    metaText: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    locationIcon: {
      marginRight: 4,
    },
    locationText: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    description: {
      marginTop: 6,
      fontSize: 12,
      color: palette.textSecondary,
    },
  });
}
