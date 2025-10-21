import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert as RNAlert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchAlertsByUser,
  fetchMyAlerts,
  updateAlertStatus,
  type LostItemAlert,
} from "../../../src/api/alerts";
import { ApiError } from "../../../src/api/httpClient";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, useAppTheme } from "../../../src/theme";

function formatCategoryLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAlertKeywords(keywords: string): string {
  return keywords
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(", ");
}

function formatAlertDate(value: string | null | undefined): string | null {
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

function formatAlertLocation(alert: LostItemAlert): string | null {
  if (alert.locationDescription) {
    return alert.locationDescription;
  }

  const { latitude, longitude } = alert;
  if (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    return `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  return null;
}

type PendingMap = Set<number>;

export default function AlertsScreen() {
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const router = useRouter();
  const { session } = useAuth();

  const [alerts, setAlerts] = useState<LostItemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingMap, setPendingMap] = useState<PendingMap>(new Set());

  const userId =
    typeof session?.userId === "number"
      ? session.userId
      : Number.isFinite(Number(session?.userId))
        ? Number(session?.userId)
        : null;

  const loadAlerts = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      if (!session) {
        if (shouldUpdate()) {
          setAlerts([]);
          setErrorMessage("Sign in to view your alerts.");
        }
        return;
      }

      try {
        const data = await (userId
          ? fetchAlertsByUser(userId)
          : fetchMyAlerts());
        if (!shouldUpdate()) {
          return;
        }
        setAlerts(data);
        setErrorMessage(null);
      } catch (error) {
        if (!shouldUpdate()) {
          return;
        }
        const message =
          error instanceof ApiError ? error.message : "Unable to load alerts.";
        setAlerts([]);
        setErrorMessage(message);
      }
    },
    [session, userId],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      loadAlerts(() => isActive)
        .catch(() => {
          // Errors are surfaced through errorMessage state.
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
    }, [loadAlerts]),
  );

  const handleRefresh = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsRefreshing(true);
    try {
      await loadAlerts();
    } catch (error) {
      // Errors already propagated to state via loadAlerts.
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoading, loadAlerts]);

  const handleToggleStatus = useCallback(
    async (alert: LostItemAlert, nextIsActive: boolean) => {
      setPendingMap((prev) => {
        const next = new Set(prev);
        next.add(alert.id);
        return next;
      });

      try {
        const updated = await updateAlertStatus(alert.id, nextIsActive);
        setAlerts((prev) =>
          prev.map((entry) =>
            entry.id === updated.id ? { ...entry, ...updated } : entry,
          ),
        );
        setErrorMessage(null);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Unable to update alert.";
        RNAlert.alert("Update failed", message);
      } finally {
        setPendingMap((prev) => {
          const next = new Set(prev);
          next.delete(alert.id);
          return next;
        });
      }
    },
    [],
  );

  const isEmpty = !isLoading && alerts.length === 0;

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
          <View>
            <Text style={styles.pageTitle}>Alerts</Text>
            <Text style={styles.pageSubtitle}>
              Manage the notifications that help you stay updated
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/screens/home/CreateAlert")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>New alert</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={palette.danger} />
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsLoading(true);
                loadAlerts()
                  .catch(() => {
                    // handled via state
                  })
                  .finally(() => {
                    setIsLoading(false);
                  });
              }}
              hitSlop={8}
            >
              <Text style={styles.errorAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && alerts.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles.loadingText}>Loading your alerts…</Text>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={palette.textSecondary}
            />
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.emptySubtitle}>
              Create an alert to get notified when matching items are found.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push("/screens/home/CreateAlert")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={palette.primary}
              />
              <Text style={styles.emptyActionText}>
                Create your first alert
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {alerts.map((alert) => {
          const isActive = alert.isActive !== false;
          const isPending = pendingMap.has(alert.id);
          const keywords = formatAlertKeywords(alert.keywords);
          const categoryLabel = formatCategoryLabel(alert.category);
          const createdAt = formatAlertDate(alert.createdAt);
          const locationLabel = formatAlertLocation(alert);

          return (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <View style={styles.alertIconBadge}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={palette.primary}
                  />
                </View>
                <View style={styles.alertHeaderText}>
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {keywords || categoryLabel}
                  </Text>
                  <Text style={styles.alertCategory}>{categoryLabel}</Text>
                  {createdAt ? (
                    <Text style={styles.alertMeta}>Created {createdAt}</Text>
                  ) : null}
                </View>
                <View style={styles.switchContainer}>
                  {isPending ? (
                    <ActivityIndicator size="small" color={palette.primary} />
                  ) : (
                    <Switch
                      value={isActive}
                      onValueChange={(next) => {
                        void handleToggleStatus(alert, next);
                      }}
                      disabled={isPending}
                      trackColor={{
                        true: palette.primary,
                        false: palette.border,
                      }}
                      thumbColor={scheme === "dark" ? "#fff" : "#f4f3f4"}
                      ios_backgroundColor={palette.border}
                    />
                  )}
                </View>
              </View>
              {locationLabel ? (
                <View style={styles.alertLocationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={palette.textSecondary}
                  />
                  <Text style={styles.alertLocationText} numberOfLines={2}>
                    {locationLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
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
      paddingTop: 12,
      paddingBottom: 40,
      gap: 20,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
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
      color: palette.textSecondary,
      textAlign: "center",
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
    alertCard: {
      padding: 18,
      borderRadius: 18,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.92)" : "rgba(255,255,255,0.96)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: scheme === "dark" ? 0.3 : 0.1,
      shadowRadius: 16,
      elevation: 8,
      gap: 10,
    },
    alertHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    alertIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? "rgba(78,129,228,0.18)" : "rgba(78,129,228,0.12)",
    },
    alertHeaderText: {
      flex: 1,
      gap: 4,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    alertCategory: {
      fontSize: 12,
      color: palette.textSecondary,
      fontWeight: "600",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    alertMeta: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    switchContainer: {
      width: 56,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    alertLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    alertLocationText: {
      flex: 1,
      fontSize: 13,
      color: palette.textSecondary,
    },
  });
}
