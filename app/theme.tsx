import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

export type Palette = {
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
};

type ThemeValue = {
  palette: Palette;
  scheme: "light" | "dark";
};

const lightPalette: Palette = {
  primary: "#4A90E2",
  primaryStrong: "#3F51B5",
  primarySoft: "#E3F1FE",
  accent: "#F5A623",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#333333",
  textSecondary: "#4F4F4F",
  border: "#E0E0E0",
};

const darkPalette: Palette = {
  primary: "#9BBFF4",
  primaryStrong: "#7992FF",
  primarySoft: "#192642",
  accent: "#FFCB6B",
  background: "#0C111A",
  surface: "#141B26",
  text: "#F5F7FA",
  textSecondary: "#C8D0DA",
  border: "#1F2933",
};

const ThemeContext = createContext<ThemeValue>({
  palette: lightPalette,
  scheme: "light",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: "light" | "dark" = systemScheme === "dark" ? "dark" : "light";

  const value = useMemo(() => {
    const palette = scheme === "dark" ? darkPalette : lightPalette;
    return { palette, scheme } satisfies ThemeValue;
  }, [scheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
