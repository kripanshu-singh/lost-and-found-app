import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ApiError } from "../../../src/api/httpClient";
import {
  updateCurrentUserProfile,
  type UpdateUserProfilePayload,
} from "../../../src/api/users";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, useAppTheme } from "../../../src/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const { session, setSession } = useAuth();

  const initialName = session?.name ?? "";
  const initialPhotoUrl = session?.profilePhoto ?? null;
  const profileInitial = initialName.slice(0, 1).toUpperCase() || "U";

  const [fullName, setFullName] = useState(initialName);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialPhotoUrl,
  );
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedName = fullName.trim();
  const hasNameChange = trimmedName !== initialName;
  const hasPhotoChange = Boolean(selectedPhotoUri);
  const hasChanges = hasNameChange || hasPhotoChange;

  const handlePickImage = useCallback(async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to update your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (asset?.uri) {
        setPhotoPreview(asset.uri);
        setSelectedPhotoUri(asset.uri);
      }
    } catch (pickerError) {
      console.error("profile-image-picker", pickerError);
      Alert.alert(
        "Could not open photos",
        "Something went wrong while accessing your photo library. Please try again.",
      );
    }
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!session) {
      return;
    }

    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    if (!hasChanges) {
      router.back();
      return;
    }

    const payload: UpdateUserProfilePayload = {};

    if (hasNameChange) {
      payload.name = trimmedName;
    }

    if (hasPhotoChange && selectedPhotoUri) {
      payload.profilePhotoUri = selectedPhotoUri;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await updateCurrentUserProfile(payload, undefined, {
        userId: session.userId,
        name: session.name,
        email: session.email,
        profilePhoto: session.profilePhoto,
      });
      const updated = {
        ...session,
        name: response.profile.name,
        profilePhoto: response.profile.profilePhoto,
      };
      await setSession(updated);
      setSelectedPhotoUri(null);
      setPhotoPreview(response.profile.profilePhoto ?? null);
      Alert.alert("Profile updated", response.message, [
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "We could not update your profile. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    hasChanges,
    hasNameChange,
    hasPhotoChange,
    router,
    selectedPhotoUri,
    session,
    setSession,
    trimmedName,
  ]);

  const handleResetPhoto = useCallback(() => {
    setPhotoPreview(initialPhotoUrl);
    setSelectedPhotoUri(null);
  }, [initialPhotoUrl]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={handleBack}
                hitSlop={12}
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={palette.primary}
                />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Edit profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarButton}
                activeOpacity={0.9}
                onPress={handlePickImage}
              >
                {photoPreview ? (
                  <Image
                    source={{ uri: photoPreview }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{profileInitial}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Tap to update your picture</Text>
              {selectedPhotoUri ? (
                <TouchableOpacity
                  onPress={handleResetPhoto}
                  style={styles.resetButton}
                  hitSlop={10}
                >
                  <Ionicons name="refresh" size={14} color={palette.primary} />
                  <Text style={styles.resetButtonText}>Use current photo</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={palette.textSecondary}
                />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={palette.textSecondary}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                {fullName.length > 0 ? (
                  <TouchableOpacity onPress={() => setFullName("")} hitSlop={8}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="rgba(0,0,0,0.3)"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.helperText}>
                This name appears on your lost &amp; found posts.
              </Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={palette.danger}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !hasChanges && styles.disabledButton,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                if (!isSubmitting) {
                  void handleSubmit();
                }
              }}
              disabled={!hasChanges || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Save changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    keyboardContainer: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: palette.text,
    },
    headerSpacer: {
      width: 36,
      height: 36,
    },
    avatarSection: {
      alignItems: "center",
      gap: 12,
    },
    avatarButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 36,
      fontWeight: "700",
      color: palette.primary,
    },
    cameraBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    avatarHint: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.primary,
      backgroundColor:
        scheme === "dark" ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.1)",
    },
    resetButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.primary,
    },
    formSection: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.surface,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: palette.text,
    },
    helperText: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        scheme === "dark" ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.08)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(239,68,68,0.35)" : "rgba(239,68,68,0.2)",
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: palette.danger,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 999,
      backgroundColor: palette.primary,
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: scheme === "dark" ? 0.35 : 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#fff",
    },
    disabledButton: {
      opacity: 0.5,
    },
    secondaryButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
  });
}
