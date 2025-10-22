import { Ionicons } from "@expo/vector-icons";
import { Slot, usePathname, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Palette, useAppTheme } from "../../../src/theme";

const NAV_ITEMS = [
  {
    label: "Home",
    icon: "home" as const,
    route: "/screens/home/Landing" as const,
    matchers: ["/screens/home/Landing"],
  },
  {
    label: "Search",
    icon: "search-outline" as const,
    route: "/screens/home/SearchItems" as const,
    matchers: ["/screens/home/SearchItems"],
  },
  {
    label: "Add",
    icon: "add-circle" as const,
    route: "/screens/home/ReportLostItem" as const,
    matchers: ["/screens/home/ReportLostItem"],
  },
  {
    label: "Alerts",
    icon: "notifications-outline" as const,
    route: "/screens/home/CreateAlert" as const,
    matchers: ["/screens/home/CreateAlert", "/screens/home/Alerts"],
  },
  {
    label: "Profile",
    icon: "person-outline" as const,
    route: "/screens/home/Profile" as const,
    matchers: ["/screens/home/Profile", "/screens/home/EditProfile"],
  },
] satisfies NavItem[];

type NavRoute =
  | "/screens/home/Landing"
  | "/screens/home/ReportLostItem"
  | "/screens/home/SearchItems"
  | "/screens/home/Profile"
  | "/screens/home/Alerts"
  | "/screens/home/CreateAlert";

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: NavRoute;
  matchers?: string[];
};

export default function HomeLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { palette, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const handleNavPress = (item: NavItem) => {
    if (!item.route) {
      return;
    }

    if (pathname !== item.route) {
      router.replace(item.route);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom:
              insets.bottom > 12 ? insets.bottom : insets.bottom + 12,
          },
        ]}
      >
        {NAV_ITEMS.map((item) => {
          const candidates = item.matchers?.length
            ? item.matchers
            : item.route
              ? [item.route]
              : [];
          const isActive = candidates.some((candidate) =>
            pathname.startsWith(candidate),
          );
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => handleNavPress(item)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={isActive ? palette.primary : palette.textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive && { color: palette.primary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      flex: 1,
    },
    bottomNav: {
      flexDirection: "row",
      backgroundColor: palette.surface,
      paddingTop: 12,
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
      gap: 4,
    },
    navLabel: {
      fontSize: 11,
      color: palette.textSecondary,
      fontWeight: "500",
    },
  });
}
