import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMyAlerts, type LostItemAlert } from "../../../src/api/alerts";
import {
  fetchMyReportedItems,
  type LostItemSummary,
} from "../../../src/api/items";
import { fetchUserKpis, type UserKpis } from "../../../src/api/users";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, useAppTheme } from "../../../src/theme";
import { LostItemCard } from "./components/LostItemCard";

function resolveStatAccent(
  icon: keyof typeof Ionicons.glyphMap,
  scheme: "light" | "dark",
) {
  if (icon === "ribbon-outline") {
    return scheme === "dark"
      ? "rgba(245,166,35,0.25)"
      : "rgba(245,166,35,0.12)";
  }
  if (icon === "notifications-outline") {
    return scheme === "dark"
      ? "rgba(155,191,244,0.24)"
      : "rgba(78,129,228,0.14)";
  }
  return scheme === "dark" ? "rgba(133,187,101,0.24)" : "rgba(74,144,226,0.14)";
}

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

  if (
    typeof alert.latitude === "number" &&
    Number.isFinite(alert.latitude) &&
    typeof alert.longitude === "number" &&
    Number.isFinite(alert.longitude)
  ) {
    return `Near ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`;
  }

  return null;
}

export default function ProfileScreen() {
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const { session, logout } = useAuth();
  const router = useRouter();
  const [reportedItems, setReportedItems] = useState<LostItemSummary[]>([]);
  const [alerts, setAlerts] = useState<LostItemAlert[]>([]);
  const [kpis, setKpis] = useState<UserKpis | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeAlertsCount = useMemo(
    () => alerts.filter((alert) => alert.isActive !== false).length,
    [alerts],
  );

  const stats = useMemo(
    () => [
      {
        key: "reported",
        label: "Items Reported",
        value: kpis?.itemsReported ?? null,
        fallback: reportedItems.length,
        icon: "cube-outline" as const,
      },
      {
        key: "claimed",
        label: "Items Claimed",
        value: kpis?.itemsClaimed ?? null,
        fallback: kpis ? kpis.itemsClaimed : 0,
        icon: "ribbon-outline" as const,
      },
      {
        key: "alerts",
        label: "Active Alerts",
        value: kpis?.activeAlerts ?? null,
        fallback: activeAlertsCount,
        icon: "notifications-outline" as const,
      },
    ],
    [activeAlertsCount, kpis, reportedItems.length],
  );

  const profileInitial = session?.name?.slice(0, 1)?.toUpperCase();

  const loadProfileData = useCallback(
    async (guard?: () => boolean) => {
      const shouldContinue = guard ?? (() => true);

      if (!session) {
        if (shouldContinue()) {
          setKpis(null);
          setReportedItems([]);
          setAlerts([]);
          setFetchError("You need to sign in to view your profile.");
        }
        return;
      }

      const errorMessages: string[] = [];

      try {
        const userKpis = await fetchUserKpis();
        if (shouldContinue()) {
          setKpis(userKpis);
        }
      } catch (error) {
        if (shouldContinue()) {
          errorMessages.push(
            error instanceof Error
              ? error.message
              : "Unable to load account KPIs.",
          );
        }
      }

      try {
        const items = await fetchMyReportedItems();
        if (shouldContinue()) {
          setReportedItems(items);
        }
      } catch (error) {
        if (shouldContinue()) {
          errorMessages.push(
            error instanceof Error
              ? error.message
              : "Unable to load reported items.",
          );
        }
      }

      try {
        const fetchedAlerts = await fetchMyAlerts();
        if (shouldContinue()) {
          setAlerts(fetchedAlerts);
        }
      } catch (error) {
        if (shouldContinue()) {
          errorMessages.push(
            error instanceof Error ? error.message : "Unable to load alerts.",
          );
        }
      }

      if (shouldContinue()) {
        setFetchError(errorMessages[0] ?? null);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      loadProfileData(() => isActive)
        .catch(() => {
          // Errors are captured via fetchError state.
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
    }, [loadProfileData]),
  );

  const handleRefresh = useCallback(async () => {
    if (isLoading) {
      return;
    }
    setIsRefreshing(true);
    try {
      await loadProfileData();
    } catch {
      // Errors are captured via fetchError state.
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoading, loadProfileData]);

  const handleEditProfile = () => {
    Alert.alert("Coming soon", "Profile editing will be available shortly.");
  };

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
    loadProfileData()
      .catch(() => {
        // Error already tracked in fetchError state.
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadProfileData]);
  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

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
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {session?.profilePhoto ? (
              <Image
                source={{ uri: session.profilePhoto }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {profileInitial ?? "U"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>
              {session?.name ?? "Guest User"}
            </Text>
            <Text style={styles.profileEmail}>
              {session?.email ?? "you@example.com"}
            </Text>
          </View>
        </View>

        {fetchError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={palette.danger} />
            <Text style={styles.errorText} numberOfLines={2}>
              {fetchError}
            </Text>
            <TouchableOpacity onPress={handleRetry} hitSlop={8}>
              <Text style={styles.errorAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsSummaryCard}>
          {stats.map((stat, index) => {
            const accent = resolveStatAccent(stat.icon, scheme);
            const displayValue =
              stat.value ?? (isLoading && !isRefreshing ? "…" : stat.fallback);
            return (
              <React.Fragment key={stat.key}>
                <View style={styles.statsSummaryColumn}>
                  <View
                    style={[styles.statsIconBadge, { backgroundColor: accent }]}
                  >
                    <Ionicons
                      name={stat.icon}
                      size={22}
                      color={palette.primary}
                    />
                  </View>
                  <Text style={styles.statsValue}>{String(displayValue)}</Text>
                  <Text style={styles.statsLabel}>{stat.label}</Text>
                </View>
                {index < stats.length - 1 ? (
                  <View style={styles.statsDivider} />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Reports</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Coming soon", "Full history will be available soon.")
            }
            hitSlop={8}
          >
            <Text style={styles.sectionAction}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardColumn}>
          {isLoading && !isRefreshing && reportedItems.length === 0 ? (
            <View style={styles.listLoadingContainer}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : null}
          {!isLoading && reportedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={palette.textSecondary}
              />
              <Text style={styles.emptyStateTitle}>No items yet</Text>
              <Text style={styles.emptyStateDescription}>
                Start by reporting a lost or found item
              </Text>
            </View>
          ) : null}
          {reportedItems.map((item) => (
            <LostItemCard
              key={item.id}
              item={item}
              palette={palette}
              scheme={scheme}
              onPress={() => handleOpenItem(item.id)}
            />
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Coming soon", "Alert management is in progress.")
            }
            hitSlop={8}
          >
            <Text style={styles.sectionAction}>Manage</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardColumn}>
          {isLoading && !isRefreshing && alerts.length === 0 ? (
            <View style={styles.listLoadingContainer}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : null}
          {!isLoading && alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-outline"
                size={64}
                color={palette.textSecondary}
              />
              <Text style={styles.emptyStateTitle}>No alerts yet</Text>
              <Text style={styles.emptyStateDescription}>
                Start by reporting a lost or found item
              </Text>
            </View>
          ) : null}
          {alerts.map((alert) => (
            <AlertCard
              key={String(alert.id)}
              alert={alert}
              palette={palette}
              scheme={scheme}
            />
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleEditProfile}
            activeOpacity={0.85}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={palette.primary}
            />
            <Text style={styles.secondaryButtonText}>Update profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.dangerButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type AlertCardProps = {
  alert: LostItemAlert;
  palette: Palette;
  scheme: "light" | "dark";
};

function AlertCard({ alert, palette, scheme }: AlertCardProps) {
  const styles = useMemo(
    () => alertCardStyles(palette, scheme),
    [palette, scheme],
  );

  const keywordsLabel = useMemo(
    () => formatAlertKeywords(alert.keywords),
    [alert.keywords],
  );
  const categoryLabel = useMemo(
    () => formatCategoryLabel(alert.category),
    [alert.category],
  );
  const createdOnLabel = useMemo(
    () => formatAlertDate(alert.createdAt),
    [alert.createdAt],
  );
  const locationLabel = useMemo(
    () => formatAlertLocation(alert),
    [alert.latitude, alert.longitude, alert.locationDescription],
  );
  const isActive = alert.isActive !== false;
  const statusLabel = isActive ? "Active" : "Paused";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons
          name="notifications-outline"
          size={18}
          color={palette.primary}
        />
        <Text style={styles.title} numberOfLines={1}>
          {keywordsLabel || categoryLabel}
        </Text>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isActive
                ? styles.statusBadgeTextActive
                : styles.statusBadgeTextInactive,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>Category: {categoryLabel}</Text>
      {createdOnLabel ? (
        <Text style={styles.meta}>Created on {createdOnLabel}</Text>
      ) : null}
      {locationLabel ? <Text style={styles.meta}>{locationLabel}</Text> : null}
    </View>
  );
}

const alertCardStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 18,
      backgroundColor:
        scheme === "dark" ? "rgba(23,33,49,0.85)" : "rgba(245,250,255,0.96)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(37,99,235,0.25)" : "rgba(37,99,235,0.2)",
      gap: 6,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    title: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
      flex: 1,
      flexShrink: 1,
    },
    meta: {
      fontSize: 13,
      color: palette.textSecondary,
      marginBottom: 2,
    },
    action: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor:
        scheme === "dark" ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.08)",
    },
    actionText: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.primary,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusBadgeActive: {
      backgroundColor:
        scheme === "dark" ? "rgba(78,129,228,0.18)" : "rgba(78,129,228,0.12)",
      borderColor:
        scheme === "dark" ? "rgba(78,129,228,0.35)" : "rgba(78,129,228,0.24)",
    },
    statusBadgeInactive: {
      backgroundColor:
        scheme === "dark" ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.12)",
      borderColor:
        scheme === "dark" ? "rgba(148,163,184,0.32)" : "rgba(148,163,184,0.24)",
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    statusBadgeTextActive: {
      color: scheme === "dark" ? "#9bbff4" : palette.primary,
    },
    statusBadgeTextInactive: {
      color: palette.textSecondary,
    },
  });

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
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: "700",
      color: palette.text,
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 18,
      gap: 16,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.85)" : "rgba(255,255,255,0.96)",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.08,
      shadowRadius: 24,
      elevation: 12,
    },
    avatarWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: "hidden",
      backgroundColor:
        scheme === "dark" ? "rgba(41,53,73,0.6)" : "rgba(226,234,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      flex: 1,
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackText: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.primary,
    },
    profileDetails: {
      flex: 1,
      gap: 6,
    },
    profileName: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
    },
    profileEmail: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    statsSummaryCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 18,
      paddingHorizontal: 12,
      borderRadius: 24,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.92)" : "rgba(255,255,255,0.96)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: scheme === "dark" ? 0.28 : 0.1,
      shadowRadius: 24,
      elevation: 12,
    },
    statsSummaryColumn: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
    },
    statsIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    statsValue: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
    },
    statsLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textSecondary,
      letterSpacing: 0.4,
    },
    statsDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
      marginVertical: 6,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(239,68,68,0.32)" : "rgba(239,68,68,0.2)",
      backgroundColor:
        scheme === "dark" ? "rgba(127,29,29,0.25)" : "rgba(254,226,226,0.85)",
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: palette.danger,
    },
    errorAction: {
      fontSize: 13,
      fontWeight: "700",
      color: palette.primary,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    sectionAction: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.primary,
    },
    cardColumn: {
      gap: 12,
    },
    listLoadingContainer: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(148,163,184,0.24)" : "rgba(148,163,184,0.18)",
      backgroundColor:
        scheme === "dark" ? "rgba(30,41,59,0.75)" : "rgba(241,245,249,0.9)",
      alignItems: "center",
      gap: 8,
    },
    emptyStateText: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: "center",
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    secondaryButton: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.primary,
    },
    dangerButton: {
      flex: 1,
      height: 52,
      borderRadius: 26,
      backgroundColor: palette.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: palette.danger,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    dangerButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#fff",
    },
    // emptyState: {
    //   alignItems: "center",
    //   paddingVertical: 40,
    //   paddingHorizontal: 20,
    // },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateDescription: {
      fontSize: 14,
      color: palette.textSecondary,
      textAlign: "center",
    },
  });
}
