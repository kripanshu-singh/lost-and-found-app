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
import {
  getCurrentUser,
  normalizeUserProfile,
  updateUserFcmToken,
} from "../api/users";
import { registerForPushNotifications } from "../notifications/pushToken";
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
  const pushTokenRef = useRef<string | null>(null);
  const isSyncingPushTokenRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      console.log("[AuthProvider] hydrate start");
      try {
        const existing = await loadSession();
        if (isMounted) {
          setSessionState(existing);
          sessionRef.current = existing;
          console.log("[AuthProvider] hydrate resolved", {
            hasSession: Boolean(existing),
            userId: existing?.userId,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("auth-hydrate", error);
        }
        console.log("[AuthProvider] hydrate error", {
          error: error instanceof Error ? error.message : error,
        });
      } finally {
        if (isMounted) {
          setIsHydrating(false);
          console.log("[AuthProvider] hydrate complete");
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
    console.log("[AuthProvider] persistSession", {
      userId: next.userId,
      email: next.email,
    });
    await saveSession(next);
    setSessionState(next);
    sessionRef.current = next;
  }, []);

  const clearSession = useCallback(async () => {
    console.log("[AuthProvider] clearSession invoked");
    await clearPersistedSession();
    setSessionState(null);
    sessionRef.current = null;
    pushTokenRef.current = null;
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthProvider] logout start");
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

      if (sessionRef.current) {
        try {
          if (__DEV__) {
            console.log("auth-logout: clearing FCM token on backend");
          }
          await updateUserFcmToken(null);
        } catch (tokenError) {
          if (__DEV__) {
            console.warn("auth-logout: failed clearing FCM token", tokenError);
          }
        }
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
      console.log("[AuthProvider] logout complete");
      if (__DEV__) {
        console.log("auth-logout: complete");
      }
    }
  }, [clearSession, updateUserFcmToken]);

  const performRefresh = useCallback(async () => {
    console.log("[AuthProvider] performRefresh start");
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
      console.log("[AuthProvider] requesting refresh", {
        hasRefreshToken: Boolean(current?.refreshToken),
        userId: current?.userId,
      });
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

      const fromRefreshPayload = normalizeUserProfile(refreshData);
      const fromResponseData = normalizeUserProfile(response.data);
      const persistedProfile = normalizeUserProfile(sessionRef.current);
      let resolvedProfile =
        fromRefreshPayload ?? fromResponseData ?? persistedProfile;

      console.log("[AuthProvider] refresh resolved profile", {
        fromRefreshPayload: Boolean(fromRefreshPayload),
        fromResponseData: Boolean(fromResponseData),
        fromPersisted: Boolean(persistedProfile),
      });

      if (!resolvedProfile) {
        try {
          const meResponse = await getCurrentUser();

          if (!meResponse.success) {
            throw new ApiError(
              meResponse.message || "Unable to load account details",
              {
                data: meResponse.data,
              },
            );
          }

          resolvedProfile = normalizeUserProfile(meResponse.data);

          if (!resolvedProfile) {
            throw new ApiError(
              meResponse.message || "Unable to load account details",
              {
                data: meResponse.data,
              },
            );
          }
        } catch (error) {
          console.log("[AuthProvider] getCurrentUser during refresh failed", {
            error: error instanceof Error ? error.message : error,
          });
          if (persistedProfile) {
            resolvedProfile = persistedProfile;
          } else {
            throw error instanceof ApiError
              ? error
              : new ApiError("Unable to load account details", {
                  cause: error,
                });
          }
        }
      }

      if (!resolvedProfile) {
        console.log("[AuthProvider] refresh failed to resolve profile");
        throw new ApiError("Unable to load account details", {
          data: response.data,
        });
      }

      const normalizedSession: AuthSession = {
        accessToken: refreshData.accessToken,
        refreshToken: refreshData.refreshToken,
        userId: resolvedProfile.userId,
        name: resolvedProfile.name,
        email: resolvedProfile.email,
        profilePhoto: resolvedProfile.profilePhoto,
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

  const syncPushToken = useCallback(async () => {
    if (!sessionRef.current) {
      return;
    }

    if (isSyncingPushTokenRef.current) {
      return;
    }

    isSyncingPushTokenRef.current = true;

    try {
      const token = await registerForPushNotifications();

      if (!token) {
        if (pushTokenRef.current) {
          console.log("[AuthProvider] Clearing stale FCM token on backend");
          try {
            await updateUserFcmToken(null);
          } catch (tokenError) {
            console.log("[AuthProvider] Failed to clear FCM token", {
              error:
                tokenError instanceof Error ? tokenError.message : tokenError,
            });
          }
          pushTokenRef.current = null;
        }
        return;
      }

      if (pushTokenRef.current === token) {
        return;
      }

      const response = await updateUserFcmToken(token);
      if (!response.success) {
        throw new ApiError(
          response.message || response.error || "Unable to update FCM token",
        );
      }

      pushTokenRef.current = token;
      console.log("[AuthProvider] FCM token synced", {
        tokenPreview: `${token.slice(0, 8)}…${token.slice(-6)}`,
      });
    } catch (error) {
      console.log("[AuthProvider] syncPushToken error", {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      isSyncingPushTokenRef.current = false;
    }
  }, [updateUserFcmToken, registerForPushNotifications]);

  const refreshSession = useCallback(async () => {
    console.log("[AuthProvider] refreshSession triggered");
    const session = await performRefresh();
    console.log("[AuthProvider] refreshSession complete", {
      refreshed: Boolean(session),
      userId: session?.userId,
    });
    return session;
  }, [performRefresh]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!session) {
      pushTokenRef.current = null;
      return;
    }

    syncPushToken().catch((error) => {
      console.log("[AuthProvider] push token sync invocation failed", {
        error: error instanceof Error ? error.message : error,
      });
    });
  }, [session, syncPushToken]);

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
