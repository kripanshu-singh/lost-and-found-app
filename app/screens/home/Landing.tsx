import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiError } from "../../../src/api/httpClient";
import {
  fetchRecentlyReported,
  type ItemCategory,
  type LostItemSummary,
} from "../../../src/api/items";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, ThemePreference, useAppTheme } from "../../../src/theme";
import { LostItemCard } from "./components/LostItemCard";

export default function Landing() {
  const router = useRouter();
  const { palette, scheme, preference, setPreference } = useAppTheme();
  const { session, logout } = useAuth();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [recentItems, setRecentItems] = useState<LostItemSummary[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const recentAbortControllerRef = useRef<AbortController | null>(null);
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const greetingName = session?.name?.split(" ").filter(Boolean)[0] ?? "there";
  const profilePhoto = session?.profilePhoto ?? null;
  const profileInitial = session?.name?.slice(0, 1)?.toUpperCase();
  const email = session?.email ?? "";

  const handleCloseMenu = () => setMenuVisible(false);

  const handleViewProfile = () => {
    setMenuVisible(false);
    router.push("/screens/home/Profile");
  };

  const themeOptions = useMemo(
    () =>
      [
        {
          label: "System",
          value: "system",
          description: "Follow device appearance",
          icon: "phone-portrait-outline",
        },
        {
          label: "Light",
          value: "light",
          description: "Use light mode",
          icon: "sunny-outline",
        },
        {
          label: "Dark",
          value: "dark",
          description: "Use dark mode",
          icon: "moon-outline",
        },
      ] satisfies {
        label: string;
        value: ThemePreference;
        description: string;
        icon: keyof typeof Ionicons.glyphMap;
      }[],
    [],
  );

  const browseCategories = useMemo(
    () => [
      {
        label: "Phone",
        value: "PHONE" as ItemCategory,
        icon: "phone-portrait-outline" as const,
      },
      {
        label: "Wallet",
        value: "WALLET" as ItemCategory,
        icon: "wallet-outline" as const,
      },
      {
        label: "Keys",
        value: "KEYS" as ItemCategory,
        icon: "key-outline" as const,
      },
      {
        label: "Bag",
        value: "BAG" as ItemCategory,
        icon: "bag-outline" as const,
      },
      {
        label: "Electronic",
        value: "ELECTRONIC" as ItemCategory,
        icon: "desktop-outline" as const,
      },
      {
        label: "Other",
        value: "OTHER" as ItemCategory,
        icon: "ellipse-outline" as const,
      },
    ],
    [],
  );

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setMenuVisible(false);
    }
  };

  const loadRecentlyReported = useCallback(async () => {
    recentAbortControllerRef.current?.abort();
    const controller = new AbortController();
    recentAbortControllerRef.current = controller;
    setIsRecentLoading(true);

    try {
      const items = await fetchRecentlyReported({ signal: controller.signal });
      setRecentItems(items);
      setRecentError(null);
    } catch (error) {
      const isCancelled =
        (error instanceof Error && error.name === "CanceledError") ||
        (error instanceof ApiError &&
          error.cause instanceof Error &&
          error.cause.name === "CanceledError");

      if (isCancelled) {
        return;
      }

      setRecentItems([]);
      setRecentError(
        error instanceof ApiError
          ? error.message
          : "Unable to load recently reported items.",
      );
    } finally {
      if (recentAbortControllerRef.current === controller) {
        recentAbortControllerRef.current = null;
        setIsRecentLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadRecentlyReported();
    return () => {
      recentAbortControllerRef.current?.abort();
      recentAbortControllerRef.current = null;
    };
  }, [loadRecentlyReported]);

  const handleOpenItemDetails = useCallback(
    (id: number) => {
      router.push({
        pathname: "/screens/home/ItemDetail",
        params: { id: String(id) },
      });
    },
    [router],
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome, {greetingName}!</Text>
            <Text style={styles.subtitle}>
              Let&apos;s find what you&apos;re looking for
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.85}
          >
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profilePhoto}
                contentFit="cover"
              />
            ) : (
              <View style={styles.profileInitialBadge}>
                <Text style={styles.profileInitialText}>
                  {profileInitial ?? "U"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/screens/home/ReportLostItem")}
              activeOpacity={0.85}
            >
              <View
                style={[styles.actionIcon, { backgroundColor: palette.accent }]}
              >
                <Ionicons name="add-circle-outline" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Report Lost Item</Text>
              <Text style={styles.actionDescription}>
                Found something? Let others know
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/screens/home/SearchItems")}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: palette.primary },
                ]}
              >
                <Ionicons name="search-outline" size={32} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Search Items</Text>
              <Text style={styles.actionDescription}>
                Looking for something you lost?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/screens/home/CreateAlert")}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={28}
                  color={palette.primary}
                />
              </View>
              <Text style={styles.actionTitle}>Create Lost Alert</Text>
              <Text style={styles.actionDescription}>
                Get notified when a matching item is found
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Reported</Text>
            <TouchableOpacity
              onPress={() => router.push("/screens/home/SearchItems")}
              activeOpacity={0.85}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isRecentLoading ? (
            <View style={styles.recentLoader}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.recentLoaderText}>
                Loading latest reports…
              </Text>
            </View>
          ) : recentError ? (
            <View style={styles.recentState}>
              <Ionicons
                name="warning-outline"
                size={40}
                color={palette.danger}
              />
              <Text style={styles.recentStateText}>{recentError}</Text>
              <TouchableOpacity
                style={styles.recentRetryButton}
                onPress={loadRecentlyReported}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={16} color={palette.surface} />
                <Text style={styles.recentRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : recentItems.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentCarousel}
            >
              {recentItems.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.carouselItem,
                    index === recentItems.length - 1
                      ? styles.carouselItemLast
                      : null,
                  ]}
                >
                  <LostItemCard
                    item={item}
                    palette={palette}
                    scheme={scheme}
                    onPress={() => handleOpenItemDetails(item.id)}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
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
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {browseCategories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={styles.categoryItem}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/screens/home/SearchItems",
                    params: { category: category.value },
                  })
                }
              >
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon}
                    size={24}
                    color={palette.primary}
                  />
                </View>
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={handleCloseMenu}>
          <Pressable style={styles.menuContainer} onPress={() => {}}>
            <View style={styles.menuHeader}>
              {profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.menuAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.menuAvatarFallback}>
                  <Text style={styles.menuAvatarInitial}>
                    {profileInitial ?? "U"}
                  </Text>
                </View>
              )}
              <View style={styles.menuHeaderText}>
                <Text style={styles.menuHeaderName}>
                  {session?.name ?? "Guest"}
                </Text>
                {email ? (
                  <Text style={styles.menuHeaderEmail} numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleViewProfile}
            >
              <Ionicons name="person-outline" size={18} color={palette.text} />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <View style={styles.menuSectionHeader}>
              <Text style={styles.menuSectionLabel}>Theme</Text>
            </View>
            {themeOptions.map((option) => {
              const isActive = preference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.menuItem}
                  onPress={() => setPreference(option.value)}
                  accessibilityState={{ selected: isActive }}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={isActive ? palette.primary : palette.textSecondary}
                  />
                  <View style={styles.themeOptionBody}>
                    <Text style={styles.menuItemText}>{option.label}</Text>
                    <Text style={styles.themeOptionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={palette.primary}
                      style={styles.themeOptionCheck}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons
                name="log-out-outline"
                size={18}
                color={palette.danger}
              />
              <Text style={[styles.menuItemText, { color: palette.danger }]}>
                Log out
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    header: {
      backgroundColor: palette.surface,
      paddingTop: 50,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greeting: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    profileButton: {
      padding: 4,
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    profileInitialBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
    },
    profileInitialText: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.primary,
    },
    profilePhoto: {
      width: "100%",
      height: "100%",
      borderRadius: 20,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.15)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
      paddingTop: 80,
      paddingRight: 16,
    },
    menuContainer: {
      width: 220,
      backgroundColor: palette.surface,
      borderRadius: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: scheme === "dark" ? 0.25 : 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    menuHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    menuHeaderText: {
      flex: 1,
    },
    menuHeaderName: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    menuHeaderEmail: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    menuAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    menuAvatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      alignItems: "center",
      justifyContent: "center",
    },
    menuAvatarInitial: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.primary,
    },
    menuDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
      marginVertical: 4,
    },
    menuSectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    menuSectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    menuItemText: {
      fontSize: 15,
      color: palette.text,
      fontWeight: "500",
    },
    themeOptionBody: {
      flex: 1,
    },
    themeOptionDescription: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 2,
    },
    themeOptionCheck: {
      marginLeft: "auto",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 16,
    },
    seeAllText: {
      fontSize: 14,
      color: palette.primary,
      fontWeight: "600",
    },
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
    },
    actionCard: {
      flexBasis: "48%",
      flexGrow: 1,
      backgroundColor: palette.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      minHeight: 150,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 4,
    },
    actionDescription: {
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 16,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    recentCarousel: {
      paddingRight: 20,
    },
    recentLoader: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      gap: 12,
    },
    recentLoaderText: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    recentState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 20,
      gap: 12,
    },
    recentStateText: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: "center",
    },
    recentRetryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.primary,
    },
    recentRetryText: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.surface,
    },
    carouselItem: {
      width: 280,
      marginRight: 12,
    },
    carouselItemLast: {
      marginRight: 0,
    },
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
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
    },
    categoryItem: {
      width: "30%",
      aspectRatio: 1,
      backgroundColor: palette.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        scheme === "dark" ? palette.primarySoft : palette.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    categoryLabel: {
      fontSize: 12,
      color: palette.text,
      textAlign: "center",
      fontWeight: "500",
    },
  });
