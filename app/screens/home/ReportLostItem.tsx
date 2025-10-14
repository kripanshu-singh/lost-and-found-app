import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../src/api/httpClient";
import { reportLostItem, type ItemCategory } from "../../../src/api/items";

import { Palette, useAppTheme } from "../../../src/theme";

const CATEGORY_OPTIONS: {
  label: string;
  value: ItemCategory;
  icon: string;
}[] = [
  { label: "Wallet", value: "WALLET", icon: "wallet-outline" },
  { label: "Phone", value: "PHONE", icon: "phone-portrait-outline" },
  { label: "Keys", value: "KEYS", icon: "key-outline" },
  { label: "Bag", value: "BAG", icon: "bag-outline" },
  { label: "Document", value: "DOCUMENT", icon: "document-text-outline" },
  { label: "Electronic", value: "ELECTRONIC", icon: "desktop-outline" },
  { label: "Other", value: "OTHER", icon: "ellipse-outline" },
];

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export default function ReportLostItem() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeholderColor = useMemo(
    () => (scheme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"),
    [scheme],
  );

  const addImageUris = (uris: string[]) => {
    setImages((prev: string[]) => {
      const unique = new Set(prev);
      uris.forEach((uri) => {
        if (unique.size < 5) {
          unique.add(uri);
        }
      });
      return Array.from(unique);
    });
  };

  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to attach item photos.",
        );
        return;
      }

      const remainingSlots = Math.max(0, 5 - images.length);
      if (remainingSlots === 0) {
        Alert.alert("Limit reached", "You can attach up to 5 photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets
          .map((asset) => asset.uri)
          .filter((uri): uri is string => Boolean(uri));
        addImageUris(newUris);
      }
    } catch (pickerError) {
      console.error("report-item-images", pickerError);
      Alert.alert(
        "Could not add photos",
        "Something went wrong while accessing your photo library.",
      );
    }
  };

  const captureWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow camera access to capture item photos.",
        );
        return;
      }

      if (images.length >= 5) {
        Alert.alert("Limit reached", "You can attach up to 5 photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          addImageUris([uri]);
        }
      }
    } catch (cameraError) {
      console.error("report-item-camera", cameraError);
      Alert.alert(
        "Could not open camera",
        "Something went wrong while launching the camera.",
      );
    }
  };

  const handleAddImage = () => {
    if (images.length >= 5) {
      Alert.alert("Limit reached", "You can attach up to 5 photos.");
      return;
    }

    setPickerVisible(true);
  };

  const handleRemoveImage = (uri: string) => {
    setImages((prev) => prev.filter((existing) => existing !== uri));
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedName = itemName.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationFound.trim();
    const trimmedDate = dateFound.trim();

    if (!trimmedName) {
      setErrorMessage("Item name is required.");
      return;
    }

    if (!category) {
      setErrorMessage("Select a category for the item.");
      return;
    }

    if (trimmedDate && !isValidISODate(trimmedDate)) {
      setErrorMessage("Enter the date in YYYY-MM-DD format.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await reportLostItem({
        itemName: trimmedName,
        category,
        description: trimmedDescription || undefined,
        locationFound: trimmedLocation || undefined,
        dateFound: trimmedDate || undefined,
        imageUris: images,
      });

      if (!response.success) {
        setErrorMessage(response.message || "Unable to submit the report.");
        return;
      }

      Alert.alert("Report submitted", response.message, [
        {
          text: "Done",
          onPress: () => router.replace("/screens/home/Landing"),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "We could not submit your report. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Report Lost Item</Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Item name *</Text>
            <TextInput
              value={itemName}
              onChangeText={setItemName}
              style={styles.input}
              placeholder="What did you find?"
              placeholderTextColor={placeholderColor}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multilineInput]}
              placeholder="Describe the item, unique markings, etc."
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formColumn}>
              <Text style={styles.label}>Location found</Text>
              <TextInput
                value={locationFound}
                onChangeText={setLocationFound}
                style={styles.input}
                placeholder="Where was it found?"
                placeholderTextColor={placeholderColor}
              />
            </View>
            <View style={styles.formColumn}>
              <Text style={styles.label}>Date found</Text>
              <TextInput
                value={dateFound}
                onChangeText={setDateFound}
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={placeholderColor}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((option) => {
                const isActive = category === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.categoryCard,
                      isActive && styles.categoryCardActive,
                    ]}
                    onPress={() => setCategory(option.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isActive ? palette.surface : palette.primary}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        isActive && styles.categoryLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Photos</Text>
              <Text style={styles.hint}>{images.length}/5 attached</Text>
            </View>
            <View style={styles.imageGrid}>
              {images.map((uri) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Image
                    source={{ uri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(uri)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 ? (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={handleAddImage}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={palette.primary}
                  />
                  <Text style={styles.addImageLabel}>Add photos</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonLabel}>Submit report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <ImagePickerSheet
        visible={isPickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onPickCamera={() => {
          setPickerVisible(false);
          void captureWithCamera();
        }}
        onPickLibrary={() => {
          setPickerVisible(false);
          void pickFromLibrary();
        }}
        styles={styles}
        palette={palette}
      />
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 20,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: palette.text,
    },
    formSection: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "android" ? 12 : 14,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.96)",
      color: palette.text,
      fontSize: 15,
    },
    multilineInput: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    formRow: {
      flexDirection: "row",
      gap: 12,
    },
    formColumn: {
      flex: 1,
      gap: 8,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    categoryCard: {
      minWidth: "30%",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
      gap: 6,
    },
    categoryCardActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    categoryLabel: {
      fontSize: 13,
      color: palette.text,
      fontWeight: "500",
      textAlign: "center",
    },
    categoryLabelActive: {
      color: palette.surface,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hint: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    imageWrapper: {
      width: 96,
      height: 96,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    removeImageButton: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    addImageButton: {
      width: 96,
      height: 96,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    addImageLabel: {
      fontSize: 12,
      color: palette.textSecondary,
      textAlign: "center",
    },
    errorText: {
      color: palette.danger,
      fontSize: 14,
    },
    submitButton: {
      backgroundColor: palette.primary,
      borderRadius: 24,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: palette.primaryStrong,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonLabel: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "flex-end",
    },
    pickerBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: 24,
    },
    pickerContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: scheme === "dark" ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 12,
    },
    pickerOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    pickerOptionText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
    pickerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
    },
    pickerCancel: {
      marginTop: 8,
      marginHorizontal: 16,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: 16,
      alignItems: "center",
    },
    pickerCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
    },
  });
}

type ReportLostItemStyles = ReturnType<typeof createStyles>;

type ImagePickerSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onPickCamera: () => void;
  onPickLibrary: () => void;
  styles: ReportLostItemStyles;
  palette: Palette;
};

function ImagePickerSheet({
  visible,
  onDismiss,
  onPickCamera,
  onPickLibrary,
  styles,
  palette,
}: ImagePickerSheetProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.pickerOverlay} onPress={onDismiss}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => {
            onDismiss();
          }}
        >
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={onPickCamera}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={20} color={palette.text} />
              <Text style={styles.pickerOptionText}>Take photo</Text>
            </TouchableOpacity>
            <View style={styles.pickerDivider} />
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={onPickLibrary}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={20} color={palette.text} />
              <Text style={styles.pickerOptionText}>Choose from library</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.pickerCancel}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
