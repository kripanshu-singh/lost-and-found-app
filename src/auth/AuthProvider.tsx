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
import {
  logoutUser,
  refreshTokens,
  type RefreshResponseData,
} from "../api/auth";
import {
  ApiError,
  registerTokenRefreshHandler,
  setAccessToken,
} from "../api/httpClient";
import {
  AuthSession,
  clearSession as clearPersistedSession,
  loadSession,
  saveSession,
  SessionError,
} from "../api/session";
import { getCurrentUser, type CurrentUserResponseData } from "../api/users";
import { useAppTheme } from "../theme";

interface AuthContextValue {
  session: AuthSession | null;
  isHydrating: boolean;
  setSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
  logout(): Promise<void>;
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

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken;

    try {
      if (__DEV__) {
        console.log("auth-logout: start", {
          hasRefreshToken: Boolean(refreshToken),
        });
      }

      if (refreshToken) {
        if (__DEV__) {
          console.log("auth-logout: sending request");
        }
        await logoutUser({ refreshToken });
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("auth-logout: request failed", error);
      }
    } finally {
      if (__DEV__) {
        console.log("auth-logout: clearing session");
      }
      await clearSession();
      if (__DEV__) {
        console.log("auth-logout: complete");
      }
    }
  }, [clearSession]);

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

    const previousAccessToken = current?.accessToken ?? null;

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

      setAccessToken(refreshData.accessToken);

      const meResponse = await getCurrentUser();
      const meData =
        meResponse.success &&
        meResponse.data &&
        !Array.isArray(meResponse.data) &&
        typeof meResponse.data === "object"
          ? (meResponse.data as CurrentUserResponseData)
          : null;

      if (
        !meResponse.success ||
        !meData ||
        typeof meData.userId !== "number" ||
        typeof meData.name !== "string" ||
        typeof meData.email !== "string"
      ) {
        throw new ApiError(
          meResponse.message || "Unable to load account details",
          {
            data: meResponse.data,
          },
        );
      }

      const normalizedSession: AuthSession = {
        accessToken: refreshData.accessToken,
        refreshToken: refreshData.refreshToken,
        userId: meData.userId,
        name: meData.name,
        email: meData.email,
        profilePhoto:
          typeof meData.profilePhoto === "string" ? meData.profilePhoto : null,
      };

      await saveSession(normalizedSession);
      sessionRef.current = normalizedSession;
      setSessionState(normalizedSession);
      return normalizedSession;
    } catch (error) {
      const normalized =
        error instanceof ApiError
          ? error
          : new ApiError("Unable to refresh session", { cause: error });

      if (normalized.status === 401) {
        await clearPersistedSession();
        sessionRef.current = null;
        setSessionState(null);
        setAccessToken(null);
      } else {
        setAccessToken(previousAccessToken);
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
      logout,
      refreshSession,
    }),
    [
      clearSession,
      isHydrating,
      logout,
      persistSession,
      refreshSession,
      session,
    ],
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
