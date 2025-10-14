import { useRouter, useSegments } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, View } from "react-native";
import { refreshTokens, type RefreshResponseData } from "../api/auth";
import { ApiError, registerTokenRefreshHandler } from "../api/httpClient";
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
  const sessionRef = useRef<AuthSession | null>(null);
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
          sessionRef.current = existing;
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
    sessionRef.current = next;
  }, []);

  const clearSession = useCallback(async () => {
    await clearPersistedSession();
    setSessionState(null);
    sessionRef.current = null;
  }, []);

  const performRefresh = useCallback(async () => {
    let current = sessionRef.current;

    if (!current) {
      try {
        current = await loadSession();
        sessionRef.current = current;
      } catch (error) {
        throw error;
      }
    }

    if (!current?.refreshToken) {
      return null;
    }

    try {
      const response = await refreshTokens({
        refreshToken: current.refreshToken,
      });
      const refreshData =
        response.data &&
        !Array.isArray(response.data) &&
        typeof response.data === "object" &&
        "accessToken" in response.data &&
        "refreshToken" in response.data
          ? (response.data as RefreshResponseData)
          : null;

      if (!response.success || !refreshData) {
        throw new ApiError(response.message || "Unable to refresh session", {
          status: 401,
          data: response.data,
        });
      }

      const updatedSession: AuthSession = {
        accessToken: refreshData.accessToken,
        refreshToken: refreshData.refreshToken,
        userId:
          typeof refreshData.userId === "number"
            ? refreshData.userId
            : current.userId,
        name:
          typeof refreshData.name === "string"
            ? refreshData.name
            : current.name,
        email:
          typeof refreshData.email === "string"
            ? refreshData.email
            : current.email,
        profilePhoto:
          typeof refreshData.profilePhoto === "string"
            ? refreshData.profilePhoto
            : (current.profilePhoto ?? null),
      };

      await saveSession(updatedSession);
      sessionRef.current = updatedSession;
      setSessionState(updatedSession);
      return updatedSession;
    } catch (error) {
      const normalized =
        error instanceof ApiError
          ? error
          : new ApiError("Unable to refresh session", { cause: error });

      if (normalized.status === 401) {
        await clearPersistedSession();
        sessionRef.current = null;
        setSessionState(null);
      }

      throw normalized;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    return performRefresh();
  }, [performRefresh]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const unregister = registerTokenRefreshHandler(async () => {
      const refreshed = await performRefresh();
      return refreshed
        ? {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          }
        : null;
    });

    return unregister;
  }, [performRefresh]);

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
