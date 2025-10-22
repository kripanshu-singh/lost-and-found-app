import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchMyReportedItems,
  type LostItemSummary,
} from "../../../src/api/items";
import { Palette, useAppTheme } from "../../../src/theme";
import { LostItemCard } from "./components/LostItemCard";

export default function MyReportedItemsScreen() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const [items, setItems] = useState<LostItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadItems = useCallback(async (guard?: () => boolean) => {
    const shouldContinue = guard ?? (() => true);

    try {
      const response = await fetchMyReportedItems();
      if (shouldContinue()) {
        setItems(response);
        setErrorMessage(null);
      }
    } catch (error) {
      if (shouldContinue()) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load your reported items.";
        setErrorMessage(message);
        setItems([]);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      loadItems(() => isActive)
        .catch(() => {
          // error captured via state
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsLoading(false);
        });

      return () => {
        isActive = false;
      };
    }, [loadItems]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadItems();
    } catch {
      // error captured via state
    } finally {
      setIsRefreshing(false);
    }
  }, [loadItems]);

  const handleOpenItem = useCallback(
    (id: number) => {
      router.push({
        pathname: "/screens/home/ItemDetail",
        params: { id: String(id) },
      });
    },
    [router],
  );

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    loadItems()
      .catch(() => {
        // error captured via state
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadItems]);

  const isEmpty = !isLoading && items.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={
              scheme === "dark" ? "rgba(32,45,68,0.9)" : "#fff"
            }
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={palette.primary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.pageTitle}>My reports</Text>
            <Text style={styles.pageSubtitle}>
              Review and manage items you have submitted
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/screens/home/ReportLostItem")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Report item</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={palette.danger} />
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMessage}
            </Text>
            <TouchableOpacity onPress={handleRetry} hitSlop={8}>
              <Text style={styles.errorAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && items.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.loadingText}>Loading your reports…</Text>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={palette.textSecondary}
            />
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptySubtitle}>
              Items you report will appear here for quick access.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push("/screens/home/ReportLostItem")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={palette.primary}
              />
              <Text style={styles.emptyActionText}>Report an item</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {items.map((item) => (
          <LostItemCard
            key={item.id}
            item={item}
            palette={palette}
            scheme={scheme}
            onPress={() => handleOpenItem(item.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      gap: 20,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    headerText: {
      flex: 1,
      paddingHorizontal: 4,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: palette.text,
    },
    pageSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: palette.textSecondary,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: palette.primary,
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.18,
      shadowRadius: 16,
      elevation: 6,
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      borderRadius: 16,
      backgroundColor:
        scheme === "dark" ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.08)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.18)",
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: palette.danger,
    },
    errorAction: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.primary,
    },
    loadingState: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 12,
    },
    loadingText: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
      gap: 16,
      borderRadius: 20,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.85)" : "rgba(255,255,255,0.96)",
      borderWidth: 1,
      borderColor: palette.border,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: "center",
      color: palette.textSecondary,
    },
    emptyAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.primary,
      backgroundColor:
        scheme === "dark" ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.1)",
    },
    emptyActionText: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.primary,
    },
  });
}
