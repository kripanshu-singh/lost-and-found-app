import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
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
import { Palette, useAppTheme } from "../../theme";

const Login = () => {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleLogin = () => {
    // Hook up authentication flow here when backend is ready.
    // For now, navigate to Landing screen
    router.replace("/screens/home/Landing");
  };

  const handleForgotPassword = () => {
    // TODO: Navigate to password recovery flow.
  };

  const handleCreateAccount = () => {
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
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Email"
                  placeholderTextColor={placeholderColor}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {username.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setUsername("")}
                    style={styles.inputAction}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="rgba(0,0,0,0.35)"
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
                    color="rgba(0,0,0,0.45)"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
              >
                <Text style={styles.loginButtonText}>Log in</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
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
      width: 120,
      height: 120,
      borderRadius: 32,
    },
    formContainer: {
      gap: 16,
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
    loginButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    forgotPassword: {
      textAlign: "center",
      color: palette.primary,
      fontSize: 15,
      fontWeight: "500",
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
