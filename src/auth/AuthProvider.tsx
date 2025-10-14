import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, View } from "react-native";
import {
  AuthSession,
  clearSession as clearPersistedSession,
  loadSession,
  saveSession,
  SessionError,
} from "../api/session";
import { useAppTheme } from "../theme";

interface AuthContextValue {
  session: AuthSession | null;
  isHydrating: boolean;
  setSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
  refreshSession(): Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const { palette } = useAppTheme();

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const existing = await loadSession();
        if (isMounted) {
          setSessionState(existing);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("auth-hydrate", error);
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    }

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    const route = Array.isArray(segments) ? segments.join("/") : "";
    const isAuthRoute = route.startsWith("screens/auth") || route === "";
    const wantsProtectedRoute = route.startsWith("screens/home");

    if (!session && wantsProtectedRoute) {
      router.replace("/screens/auth/Login");
    } else if (session && isAuthRoute) {
      router.replace("/screens/home/Landing");
    }
  }, [isHydrating, router, session, segments]);

  const persistSession = useCallback(async (next: AuthSession) => {
    await saveSession(next);
    setSessionState(next);
  }, []);

  const clearSession = useCallback(async () => {
    await clearPersistedSession();
    setSessionState(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshed = await loadSession();
    setSessionState(refreshed);
    return refreshed;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrating,
      setSession: persistSession,
      clearSession,
      refreshSession,
    }),
    [clearSession, isHydrating, persistSession, refreshSession, session],
  );

  if (isHydrating) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new SessionError("useAuth must be used within an AuthProvider");
  }
  return context;
}
