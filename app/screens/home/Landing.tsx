import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../../src/auth/AuthProvider";
import { useAppTheme } from "../../../src/theme";

export default function Landing() {
  const { palette, scheme } = useAppTheme();
  const { session } = useAuth();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const greetingName = session?.name?.split(" ").filter(Boolean)[0] ?? "there";
  const profilePhoto = session?.profilePhoto ?? null;

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
          <TouchableOpacity style={styles.profileButton}>
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
            <TouchableOpacity style={styles.actionCard}>
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

          {/* Empty State */}
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
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {[
              { icon: "wallet-outline", label: "Wallets" },
              { icon: "phone-portrait-outline", label: "Phones" },
              { icon: "key-outline", label: "Keys" },
              { icon: "bag-outline", label: "Bags" },
              { icon: "card-outline", label: "Documents" },
              { icon: "desktop-outline", label: "Electronics" },
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color={palette.primary} />
          <Text style={[styles.navLabel, { color: palette.primary }]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name="search-outline"
            size={24}
            color={palette.textSecondary}
          />
          <Text style={styles.navLabel}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="add-circle" size={24} color={palette.textSecondary} />
          <Text style={styles.navLabel}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name="notifications-outline"
            size={24}
            color={palette.textSecondary}
          />
          <Text style={styles.navLabel}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons
            name="person-outline"
            size={24}
            color={palette.textSecondary}
          />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
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
    bottomNav: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      backgroundColor: palette.surface,
      paddingTop: 12,
      paddingBottom: 24,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: scheme === "dark" ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    navLabel: {
      fontSize: 11,
      color: palette.textSecondary,
      marginTop: 4,
      fontWeight: "500",
    },
  });
