import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser, type LoginResponseData } from "../../../src/api/auth";
import { ApiError, setAccessToken } from "../../../src/api/httpClient";
import { SessionError } from "../../../src/api/session";
import {
  getCurrentUser,
  normalizeUserProfile,
  type NormalizedUserProfile,
} from "../../../src/api/users";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, useAppTheme } from "../../../src/theme";

const Login = () => {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const { setSession: persistSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const placeholderColor = useMemo(
    () => (scheme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"),
    [scheme],
  );
  const iconColor = useMemo(
    () => (scheme === "dark" ? palette.textSecondary : "rgba(0,0,0,0.6)"),
    [palette.textSecondary, scheme],
  );
  const actionIconColor = useMemo(
    () => (scheme === "dark" ? palette.textSecondary : "rgba(0,0,0,0.45)"),
    [palette.textSecondary, scheme],
  );
  const collectFieldErrors = (data: unknown) => {
    if (!data || Array.isArray(data) || typeof data !== "object") {
      return null;
    }

    const values = Object.values(data as Record<string, unknown>).flatMap(
      (value) => {
        if (typeof value === "string") {
          return value;
        }
        if (Array.isArray(value)) {
          return value.filter((item) => typeof item === "string") as string[];
        }
        return [];
      },
    );

    return values.length > 0 ? values.join("\n") : null;
  };

  const handleLogin = async () => {
    if (isSubmitting) {
      console.log("[Login] handleLogin skipped (already submitting)");
      return;
    }

    Keyboard.dismiss();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    console.log("[Login] handleLogin start", {
      email: trimmedEmail,
      hasPassword: Boolean(trimmedPassword),
    });

    if (trimmedEmail !== email) {
      setEmail(trimmedEmail);
    }

    if (!trimmedEmail || !trimmedPassword) {
      console.log("[Login] missing credentials", {
        hasEmail: Boolean(trimmedEmail),
        hasPassword: Boolean(trimmedPassword),
      });
      setErrorMessage("Enter both email and password to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      console.log("[Login] calling loginUser", { email: trimmedEmail });

      const response = await loginUser({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      console.log("[Login] loginUser response", {
        success: response.success,
        message: response.message,
        hasData: Boolean(response.data),
      });

      const loginData =
        response.data &&
        !Array.isArray(response.data) &&
        typeof response.data === "object" &&
        "accessToken" in response.data
          ? (response.data as LoginResponseData)
          : null;

      if (!response.success || !loginData) {
        console.log("[Login] loginUser validation failed", {
          success: response.success,
          normalized: Boolean(loginData),
        });
        const fieldErrors = collectFieldErrors(response.data);
        setErrorMessage(
          fieldErrors || response.message || "We could not sign you in.",
        );
        return;
      }

      setAccessToken(loginData.accessToken);

      let currentUser: NormalizedUserProfile | null =
        normalizeUserProfile(loginData);

      console.log("[Login] normalized login payload", {
        fromLoginPayload: Boolean(currentUser),
        userId: currentUser?.userId,
      });

      if (!currentUser) {
        console.log("[Login] fetching /api/users/me for fallback profile");
        try {
          const meResponse = await getCurrentUser();

          console.log("[Login] /api/users/me response", {
            success: meResponse.success,
            message: meResponse.message,
            hasData: Boolean(meResponse.data),
          });

          if (!meResponse.success) {
            throw new ApiError(
              meResponse.message || "Unable to load your account",
              { data: meResponse.data },
            );
          }

          currentUser = normalizeUserProfile(meResponse.data);

          if (!currentUser) {
            console.log("[Login] normalizeUserProfile failed on /me payload", {
              keys:
                meResponse.data && typeof meResponse.data === "object"
                  ? Object.keys(meResponse.data)
                  : null,
            });
            throw new ApiError(
              meResponse.message || "Unable to load your account",
              { data: meResponse.data },
            );
          }
        } catch (error) {
          console.log("[Login] getCurrentUser error", {
            error: error instanceof Error ? error.message : error,
          });
          setAccessToken(null);
          throw error instanceof ApiError
            ? error
            : new ApiError("Unable to load your account", { cause: error });
        }
      }

      if (!currentUser) {
        console.log("[Login] normalization failed after fallback");
        throw new ApiError("Unable to load your account");
      }

      console.log("[Login] persisting session", {
        userId: currentUser.userId,
        email: currentUser.email,
      });

      await persistSession({
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        userId: currentUser.userId,
        name: currentUser.name,
        email: currentUser.email,
        profilePhoto: currentUser.profilePhoto,
      });

      setPassword("");
      console.log("[Login] navigation to Landing");
      router.replace("/screens/home/Landing");
    } catch (error) {
      console.log("[Login] handleLogin error", {
        email: trimmedEmail,
        error: error instanceof Error ? error.message : error,
      });
      setAccessToken(null);
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof SessionError
            ? "We couldn't save your session securely. Please ensure device security is available and try again."
            : "We were unable to contact the server. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = () => {
    if (isSubmitting) {
      console.log("[Login] handleCreateAccount blocked (submitting)");
      return;
    }
    console.log("[Login] navigating to Register");
    router.push("/screens/auth/Register");
  };

  return (
    <ImageBackground
      // source={{
      //   uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1470&q=80",
      // }}
      style={styles.gradient}
      imageStyle={styles.backgroundImage}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardContainer}
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>Log in</Text>
            </View>

            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/images/icon.png")}
                style={styles.logo}
                contentFit="contain"
                transition={200}
              />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={iconColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEmail("")}
                    style={styles.inputAction}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={actionIconColor}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-open-outline"
                  size={20}
                  color={iconColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.inputAction}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={actionIconColor}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isSubmitting && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Log in</Text>
                )}
              </TouchableOpacity>

              {errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
            </View>

            <View style={styles.footerContainer}>
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={handleCreateAccount}
              >
                <Text style={styles.createAccountText}>Create new account</Text>
              </TouchableOpacity>
              <Text style={styles.metaText}>Lost &amp; Found</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
};
export default Login;

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    gradient: {
      flex: 1,
      backgroundColor:
        scheme === "dark" ? palette.background : palette.background,
    },
    backgroundImage: {
      opacity: scheme === "dark" ? 0.08 : 0.18,
    },
    safeArea: {
      flex: 1,
    },
    keyboardContainer: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    logoContainer: {
      flex: 0.35,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 150,
      height: 150,
      borderRadius: 32,
    },
    formContainer: {
      gap: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
    },
    inputWrapper: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.85)" : "rgba(255,255,255,0.9)",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    inputIcon: {
      marginRight: 12,
      color: scheme === "dark" ? palette.textSecondary : "rgba(0,0,0,0.6)",
    },
    input: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 4,
      color: palette.text,
    },
    inputAction: {
      marginLeft: 12,
    },
    loginButton: {
      backgroundColor: palette.primary,
      borderRadius: 25,
      paddingVertical: 14,
      alignItems: "center",
      shadowColor: palette.primaryStrong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 12,
      elevation: 4,
    },
    loginButtonDisabled: {
      opacity: 0.65,
    },
    loginButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    errorText: {
      color: "#ff4d4f",
      textAlign: "center",
      fontSize: 14,
    },
    footerContainer: {
      alignItems: "center",
      gap: 16,
    },
    createAccountButton: {
      borderWidth: 1,
      borderColor: palette.primary,
      borderRadius: 25,
      paddingVertical: 14,
      paddingHorizontal: 32,
      backgroundColor: scheme === "dark" ? "transparent" : palette.surface,
    },
    createAccountText: {
      color: palette.primary,
      fontSize: 16,
      fontWeight: "600",
    },
    metaText: {
      color: palette.textSecondary,
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 1.4,
    },
  });
}
