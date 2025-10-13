import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Palette, useAppTheme } from "../../theme";

const Register = () => {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  const handleCreateAccount = () => {
    // Hook up registration logic here when backend/api is ready.
    // For now, navigate to Landing screen
    router.replace("/screens/home/Landing");
  };

  const handleSelectPhoto = async () => {
    // TODO: Integrate Expo ImagePicker to upload/select a profile photo.
    setPhotoUri(null);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              //   className="bg-red-500"
            >
              <View style={styles.headerRow}>
                <Text style={styles.title}>Create account</Text>
              </View>

              <View style={styles.photoWrapper}>
                <TouchableOpacity
                  style={styles.photoButton}
                  activeOpacity={0.85}
                  onPress={handleSelectPhoto}
                >
                  <Image
                    source={
                      photoUri
                        ? { uri: photoUri }
                        : require("../../../assets/images/icon.png")
                    }
                    style={styles.profilePhoto}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.photoHint}>Add a profile picture</Text>
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
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Full name"
                    placeholderTextColor={placeholderColor}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                  {fullName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setFullName("")}
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
                    name="mail-outline"
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
                        color="rgba(0,0,0,0.35)"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
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
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={handleCreateAccount}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.replace("/screens/auth/Login")}
              >
                <Text style={styles.loginLinkText}>Log in</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                By continuing I agree with the
                <Text style={styles.termsLink}> Privacy Policy</Text>,
                <Text style={styles.termsLink}> Terms & Conditions</Text>
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Register;

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        scheme === "dark" ? palette.background : palette.background,
    },
    safeArea: {
      flex: 1,
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      gap: 24,
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
    loginLink: {
      borderRadius: 24,
      paddingVertical: 16,
      alignItems: "center",
      backgroundColor: scheme === "dark" ? "transparent" : palette.surface,
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(255,255,255,0.35)" : palette.border,
    },
    loginLinkText: {
      color: scheme === "dark" ? palette.text : palette.primaryStrong,
      fontSize: 16,
      fontWeight: "600",
    },
    photoWrapper: {
      alignItems: "center",
      gap: 12,
    },
    photoButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? palette.surface : "rgba(255,255,255,0.96)",
      borderWidth: 1,
      borderColor: palette.border,
    },
    profilePhoto: {
      width: "100%",
      height: "100%",
    },
    cameraBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
      shadowColor: palette.primaryStrong,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    photoHint: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    formContainer: {
      gap: 16,
    },
    inputWrapper: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.92)",
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
    primaryButton: {
      backgroundColor: palette.primary,
      borderRadius: 24,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: palette.primaryStrong,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    termsText: {
      textAlign: "center",
      color: palette.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    termsLink: {
      color: palette.primary,
      fontWeight: "600",
    },
  });
}
