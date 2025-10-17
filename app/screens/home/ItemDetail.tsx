import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../src/api/httpClient";
import {
  fetchLostItemById,
  type ItemCategory,
  type LostItemDetail,
} from "../../../src/api/items";
import { Palette, useAppTheme } from "../../../src/theme";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521208914987-3eab03c06a61?auto=format&fit=crop&w=1200&q=80";

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const numericId = useMemo(() => {
    if (!rawId) {
      return null;
    }
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [rawId]);

  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const { width: screenWidth } = useWindowDimensions();

  const [item, setItem] = useState<LostItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const carouselImages = useMemo(() => {
    return sanitizeImageUris(item?.images);
  }, [item?.images]);

  const loadItem = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!numericId) {
        setItem(null);
        setErrorMessage("Item not found.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await fetchLostItemById(numericId, {
          signal: controller.signal,
        });
        setItem(data);
        setErrorMessage(null);
        setActiveImageIndex(0);
      } catch (error) {
        const isCancelled = isRequestCancelled(error);
        if (isCancelled) {
          return;
        }

        setItem(null);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Unable to load this item right now.",
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        if (mode === "initial") {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [numericId],
  );

  useEffect(() => {
    if (!numericId) {
      setIsLoading(false);
      setErrorMessage("Item not found.");
      return;
    }

    loadItem("initial");

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadItem, numericId]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing || !numericId) {
      return;
    }
    loadItem("refresh");
  }, [isRefreshing, loadItem, numericId]);

  const handleRetry = useCallback(() => {
    loadItem("initial");
  }, [loadItem]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/screens/home/Landing");
  }, [router]);

  const handleOpenMap = useCallback(() => {
    if (!item) {
      return;
    }
    const url = buildMapUrl(item);
    if (!url) {
      Alert.alert("Location unavailable", "This item has no map location yet.");
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open maps", "Please try again later.");
    });
  }, [item]);

  const handleShare = useCallback(async () => {
    if (!item) {
      return;
    }

    const shareMessage = [
      item.itemName,
      item.locationFound ? `Location: ${item.locationFound}` : undefined,
      item.description ? `Details: ${item.description}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await Share.share({
        message: shareMessage || item.itemName,
        title: "Lost item",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "User did not share") {
        return;
      }
      Alert.alert("Unable to share", "Please try again.");
    }
  }, [item]);

  const statusLabel = useMemo(() => {
    return item ? formatStatusLabel(item.status) : "";
  }, [item]);

  const categoryLabel = useMemo(() => {
    return item ? formatCategoryLabel(item.category) : "";
  }, [item]);

  const foundDateLabel = useMemo(() => {
    return item ? formatFoundDate(item.dateFound) : "";
  }, [item]);

  const coordinateLabel = useMemo(() => {
    if (!item) {
      return null;
    }
    return formatCoordinates(item.latitude, item.longitude);
  }, [item]);

  const statusTone = useMemo(() => {
    const tone = normalizeStatusTone(item?.status);
    if (tone === "available") {
      return {
        pill: styles.statusPillAvailable,
        text: styles.statusTextAvailable,
      } as const;
    }
    if (tone === "claimed") {
      return {
        pill: styles.statusPillClaimed,
        text: styles.statusTextClaimed,
      } as const;
    }
    return {
      pill: styles.statusPillDefault,
      text: styles.statusTextDefault,
    } as const;
  }, [item?.status, styles]);

  const renderLoader = () => (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.centerStateText}>Loading item…</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerState}>
      <Ionicons name="warning-outline" size={48} color={palette.danger} />
      <Text style={styles.centerStateTitle}>Couldn&apos;t load item</Text>
      <Text style={styles.centerStateText}>
        {errorMessage ?? "Please try again in a moment."}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={16} color={palette.surface} />
        <Text style={styles.retryButtonLabel}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={palette.primary}
          colors={[palette.primary]}
        />
      }
    >
      <View style={styles.imagePagerWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / Math.max(screenWidth, 1),
            );
            setActiveImageIndex(index);
          }}
        >
          {carouselImages.map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={[styles.heroImage, { width: screenWidth }]}
              contentFit="cover"
            />
          ))}
        </ScrollView>
        <View style={styles.carouselIndicators}>
          {carouselImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.carouselDot,
                index === activeImageIndex ? styles.carouselDotActive : null,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.itemTitle}>{item?.itemName}</Text>
            <Text style={styles.itemSubtitle}>{categoryLabel}</Text>
          </View>
          <View style={[styles.statusPill, statusTone.pill]}>
            <Text style={[styles.statusText, statusTone.text]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        {foundDateLabel ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={palette.textSecondary}
            />
            <Text style={styles.metaValue}>Reported on {foundDateLabel}</Text>
          </View>
        ) : null}
        {item?.locationFound ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={palette.textSecondary}
            />
            <Text style={styles.metaValue}>{item.locationFound}</Text>
          </View>
        ) : null}
        {coordinateLabel ? (
          <TouchableOpacity
            style={styles.metaRow}
            onPress={handleOpenMap}
            activeOpacity={0.85}
          >
            <Ionicons
              name="map-outline"
              size={18}
              color={palette.textSecondary}
            />
            <Text style={[styles.metaValue, styles.linkText]}>
              {coordinateLabel} (View map)
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {item?.description ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.bodyText}>{item.description}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: palette.primary }]}
            onPress={handleOpenMap}
            activeOpacity={0.85}
          >
            <Ionicons
              name="navigate-outline"
              size={18}
              color={palette.surface}
            />
            <Text
              style={[styles.primaryActionText, { color: palette.surface }]}
            >
              Open in Maps
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: palette.border }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={18} color={palette.text} />
            <Text style={styles.secondaryActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleClose}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item details</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? renderLoader() : null}
      {!isLoading && errorMessage ? renderError() : null}
      {!isLoading && !errorMessage ? renderContent() : null}
    </SafeAreaView>
  );
}

function formatCategoryLabel(category: ItemCategory): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatusLabel(status: string): string {
  return (
    status
      .toLowerCase()
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ") || "Unknown"
  );
}

function formatFoundDate(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function sanitizeImageUris(images?: string[] | null): string[] {
  if (!images || images.length === 0) {
    return [FALLBACK_IMAGE];
  }
  const valid = images.filter((uri) => isProbablyImageUri(uri));
  return valid.length > 0 ? valid : [FALLBACK_IMAGE];
}

function isProbablyImageUri(uri: string | null | undefined): boolean {
  if (!uri) {
    return false;
  }
  const lower = uri.toLowerCase();
  if (!lower.startsWith("http")) {
    return false;
  }
  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".heic"];
  return extensions.some((extension) => lower.includes(extension));
}

function buildMapUrl(item: LostItemDetail): string | null {
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.locationFound) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.locationFound)}`;
  }
  return null;
}

function normalizeStatusTone(
  status: string | undefined | null,
): "default" | "available" | "claimed" {
  if (!status) {
    return "default";
  }
  const normalized = status.toLowerCase();
  if (normalized === "claimed") {
    return "claimed";
  }
  if (normalized === "available") {
    return "available";
  }
  return "default";
}

function isRequestCancelled(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (
    error instanceof ApiError &&
    error.cause instanceof Error &&
    (error.cause.name === "CanceledError" || error.cause.name === "AbortError")
  ) {
    return true;
  }
  return (
    error instanceof Error &&
    (error.name === "CanceledError" || error.name === "AbortError")
  );
}

const createStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
      gap: 20,
    },
    imagePagerWrapper: {
      backgroundColor: palette.surface,
    },
    heroImage: {
      height: 260,
    },
    carouselIndicators: {
      flexDirection: "row",
      alignSelf: "center",
      gap: 6,
      marginTop: 12,
    },
    carouselDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)",
    },
    carouselDotActive: {
      backgroundColor: palette.primary,
    },
    sectionCard: {
      marginHorizontal: 20,
      padding: 20,
      borderRadius: 18,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.12,
      shadowRadius: 10,
      elevation: 4,
      gap: 16,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
    },
    sectionTitleGroup: {
      flex: 1,
      gap: 4,
    },
    itemTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: palette.text,
    },
    itemSubtitle: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    statusPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    statusText: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    statusPillDefault: {
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)",
      borderColor:
        scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.1)",
    },
    statusPillAvailable: {
      backgroundColor:
        scheme === "dark" ? "rgba(142,207,128,0.25)" : "rgba(55,125,34,0.15)",
      borderColor:
        scheme === "dark" ? "rgba(142,207,128,0.4)" : "rgba(55,125,34,0.35)",
    },
    statusPillClaimed: {
      backgroundColor:
        scheme === "dark" ? "rgba(245,166,35,0.28)" : "rgba(245,166,35,0.18)",
      borderColor:
        scheme === "dark" ? "rgba(245,166,35,0.45)" : "rgba(245,166,35,0.35)",
    },
    statusTextDefault: {
      color: palette.text,
    },
    statusTextAvailable: {
      color: scheme === "dark" ? "#9de38b" : "#2f6b22",
    },
    statusTextClaimed: {
      color: scheme === "dark" ? "#ffd48b" : "#af6a00",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    metaValue: {
      flex: 1,
      fontSize: 14,
      color: palette.text,
    },
    linkText: {
      color: palette.primary,
      fontWeight: "600",
    },
    sectionHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.text,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12,
    },
    primaryAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flex: 1,
    },
    primaryActionText: {
      fontSize: 15,
      fontWeight: "600",
    },
    secondaryAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flex: 1,
      borderWidth: 1,
      backgroundColor: palette.surface,
    },
    secondaryActionText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 16,
    },
    centerStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
      textAlign: "center",
    },
    centerStateText: {
      fontSize: 14,
      color: palette.textSecondary,
      textAlign: "center",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      backgroundColor: palette.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryButtonLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.surface,
    },
    bottomSpacer: {
      height: 20,
    },
  });
