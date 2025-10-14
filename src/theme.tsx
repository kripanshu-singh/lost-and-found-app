import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
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
  danger: string;
};

export type ThemePreference = "system" | "light" | "dark";

type ThemeValue = {
  palette: Palette;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
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
  danger: "#FF3B30",
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
  danger: "#FF453A",
};

const ThemeContext = createContext<ThemeValue>({
  palette: lightPalette,
  scheme: "light",
  preference: "system",
  setPreference: () => {
    throw new Error("ThemeProvider missing in component tree");
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  const handleSetPreference = useCallback((value: ThemePreference) => {
    setPreference(value);
  }, []);

  const scheme: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value = useMemo(() => {
    const palette = scheme === "dark" ? darkPalette : lightPalette;
    return {
      palette,
      scheme,
      preference,
      setPreference: handleSetPreference,
    } satisfies ThemeValue;
  }, [scheme, preference, handleSetPreference]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
