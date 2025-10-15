import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type LostItemSummary } from "../../../src/api/items";
import { useAuth } from "../../../src/auth/AuthProvider";
import { ThemePreference, useAppTheme } from "../../../src/theme";
import { LostItemCard } from "./components/LostItemCard";

const MOCK_RECENT_ITEMS: LostItemSummary[] = [
  {
    id: 5,
    itemName: "Bobby",
    description: "Lorem, ipsum dolor.",
    locationFound: "Library",
    latitude: 9.0001,
    longitude: 8.0001,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448231/lost-and-found/items/file_d24ykb.jpg",
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448245/lost-and-found/items/file_op6d62.jpg",
    ],
    dateFound: "2025-10-14",
    status: "CLAIMED",
    category: "PHONE",
    postedByUserId: 5,
    claimedByUserId: 1,
  },
  {
    id: 3,
    itemName: "Ksmsn",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448062/lost-and-found/items/file_e3cc9p.jpg",
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448065/lost-and-found/items/file_q1dvjt.jpg",
    ],
    dateFound: "2025-10-14",
    status: "AVAILABLE",
    category: "WALLET",
    postedByUserId: 5,
    claimedByUserId: null,
  },
  {
    id: 4,
    itemName: "Jkendn",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448095/lost-and-found/items/file_zhxfph.jpg",
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448097/lost-and-found/items/file_cs64hw.jpg",
    ],
    dateFound: "2025-10-14",
    status: "AVAILABLE",
    category: "OTHER",
    postedByUserId: 5,
    claimedByUserId: null,
  },
  {
    id: 8,
    itemName: "By",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448519/lost-and-found/items/file_u3sqvl.jpg",
    ],
    dateFound: "2025-10-14",
    status: "AVAILABLE",
    category: "WALLET",
    postedByUserId: 5,
    claimedByUserId: null,
  },
  {
    id: 6,
    itemName: "Ved",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760448458/lost-and-found/items/file_t879cu.jpg",
    ],
    dateFound: "2025-10-14",
    status: "AVAILABLE",
    category: "OTHER",
    postedByUserId: 5,
    claimedByUserId: null,
  },
  {
    id: 7,
    itemName: "Jesse",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [],
    dateFound: "2025-10-14",
    status: "AVAILABLE",
    category: "WALLET",
    postedByUserId: 5,
    claimedByUserId: null,
  },
  {
    id: 2,
    itemName: "Black bottle",
    description: null,
    locationFound: null,
    latitude: null,
    longitude: null,
    images: [
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760447994/lost-and-found/items/file_fq7bgw.jpg",
      "https://res.cloudinary.com/dvu7kedjd/image/upload/v1760447998/lost-and-found/items/file_ofwriw.jpg",
    ],
    dateFound: "2025-10-13",
    status: "AVAILABLE",
    category: "OTHER",
    postedByUserId: 5,
    claimedByUserId: null,
  },
];

export default function Landing() {
  const router = useRouter();
  const { palette, scheme, preference, setPreference } = useAppTheme();
  const { session, logout } = useAuth();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const greetingName = session?.name?.split(" ").filter(Boolean)[0] ?? "there";
  const profilePhoto = session?.profilePhoto ?? null;
  const email = session?.email ?? "";

  const handleCloseMenu = () => setMenuVisible(false);

  const handleViewProfile = () => {
    setMenuVisible(false);
    Alert.alert("Profile", "Profile view is coming soon.");
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

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setMenuVisible(false);
    }
  };

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
              <Ionicons
                name="person-circle-outline"
                size={32}
                color={palette.text}
              />
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

            <TouchableOpacity style={styles.actionCard}>
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
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Items</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {MOCK_RECENT_ITEMS.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentCarousel}
            >
              {MOCK_RECENT_ITEMS.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.carouselItem,
                    index === MOCK_RECENT_ITEMS.length - 1
                      ? styles.carouselItemLast
                      : null,
                  ]}
                >
                  <LostItemCard
                    item={item}
                    palette={palette}
                    scheme={scheme}
                    onPress={() =>
                      Alert.alert(
                        "Item details",
                        "A detailed view is coming soon.",
                      )
                    }
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
            {[
              {
                label: "Phone",
                value: "PHONE",
                icon: "phone-portrait-outline",
              },
              { label: "Wallet", value: "WALLET", icon: "wallet-outline" },
              { label: "Keys", value: "KEYS", icon: "key-outline" },
              { label: "Bag", value: "BAG", icon: "bag-outline" },
              {
                label: "Electronic",
                value: "ELECTRONIC",
                icon: "desktop-outline",
              },
              { label: "Other", value: "OTHER", icon: "ellipse-outline" },
            ].map((category, index) => (
              <TouchableOpacity key={index} style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Ionicons
                    name={category.icon as any}
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
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={palette.text}
                  />
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

const createStyles = (palette: any, scheme: "light" | "dark") =>
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
      gap: 12,
      // justifyContent: "space-between",
    },
    actionCard: {
      flex: 1,
      backgroundColor: palette.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
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
