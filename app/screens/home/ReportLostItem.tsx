import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../src/api/httpClient";
import { reportLostItem, type ItemCategory } from "../../../src/api/items";

import { Palette, useAppTheme } from "../../../src/theme";

const CATEGORY_OPTIONS: {
  label: string;
  value: ItemCategory;
  icon: string;
}[] = [
  { label: "Phone", value: "PHONE", icon: "phone-portrait-outline" },
  { label: "Wallet", value: "WALLET", icon: "wallet-outline" },
  { label: "Keys", value: "KEYS", icon: "key-outline" },
  { label: "Bag", value: "BAG", icon: "bag-outline" },
  { label: "Electronic", value: "ELECTRONIC", icon: "desktop-outline" },
  { label: "Clothing", value: "CLOTHING", icon: "shirt-outline" },
  { label: "Stationery", value: "STATIONERY", icon: "create-outline" },
  { label: "Document", value: "DOCUMENT", icon: "document-text-outline" },
  { label: "Other", value: "OTHER", icon: "ellipse-outline" },
];

const DEFAULT_REGION: Region = {
  latitude: 25.8318,
  longitude: 82.68242,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function ReportLostItem() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const mapRef = useRef<MapView | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedCoordinate, setSelectedCoordinate] = useState<LatLng | null>(
    null,
  );
  const [isMapModalVisible, setMapModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const [locationFound, setLocationFound] = useState("");
  const [dateFound, setDateFound] = useState<Date | null>(today);
  const [iosDateDraft, setIosDateDraft] = useState<Date>(today);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeholderColor = useMemo(
    () => (scheme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"),
    [scheme],
  );

  const formatDateForDisplay = (value: Date | null) => {
    if (!value) {
      return "Select date";
    }
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateForApi = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizeDate = (value: Date) => {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  useEffect(() => {
    if (!isMapModalVisible || !mapRef.current) {
      return;
    }

    const targetRegion = selectedCoordinate
      ? {
          latitude: selectedCoordinate.latitude,
          longitude: selectedCoordinate.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }
      : mapRegion;

    mapRef.current.animateToRegion(targetRegion, 250);
  }, [isMapModalVisible, selectedCoordinate, mapRegion]);

  const handleMapPress = (event: MapPressEvent) => {
    const { coordinate } = event.nativeEvent;
    const normalized: LatLng = {
      latitude: Number(coordinate.latitude.toFixed(6)),
      longitude: Number(coordinate.longitude.toFixed(6)),
    };
    setSelectedCoordinate(normalized);
    setMapRegion((prev) => ({
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      latitudeDelta: prev?.latitudeDelta ?? 0.01,
      longitudeDelta: prev?.longitudeDelta ?? 0.01,
    }));
    setLocationError(null);
  };

  const clearSelectedCoordinate = () => {
    setSelectedCoordinate(null);
    setLocationError(null);
  };

  const openMapModal = async () => {
    setLocationError(null);
    setHasLocationPermission(false);
    setMapModalVisible(true);
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const granted = permission.status === "granted";
      setHasLocationPermission(granted);

      if (!granted) {
        setLocationError(
          "Location permission denied. Pan the map and tap to drop a pin.",
        );
        setMapRegion(DEFAULT_REGION);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextRegion: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(nextRegion);
      setSelectedCoordinate(
        (prev) =>
          prev ?? {
            latitude: Number(current.coords.latitude.toFixed(6)),
            longitude: Number(current.coords.longitude.toFixed(6)),
          },
      );
    } catch (error) {
      setLocationError(
        "Couldn't fetch your location. Pan the map and tap to drop a pin.",
      );
      setMapRegion(DEFAULT_REGION);
      setHasLocationPermission(false);
    } finally {
      setIsLocating(false);
    }
  };

  const closeMapModal = () => {
    setMapModalVisible(false);
    setIsLocating(false);
    mapRef.current = null;
  };

  const handleConfirmLocation = () => {
    if (!selectedCoordinate) {
      setLocationError("Tap the map to drop a pin before confirming.");
      return;
    }

    setLocationError(null);
    closeMapModal();
  };

  const openDatePicker = () => {
    const reference = dateFound ? new Date(dateFound) : new Date(today);
    reference.setHours(0, 0, 0, 0);
    if (Platform.OS === "android") {
      const androidPickerParams = {
        value: reference,
        mode: "date" as const,
        display: "calendar" as const,
        maximumDate: today,
        onChange: (_event: any, selectedDate?: Date) => {
          if (selectedDate) {
            const nextDate = normalizeDate(selectedDate);
            setDateFound(nextDate > today ? today : nextDate);
          }
        },
      } as Parameters<typeof DateTimePickerAndroid.open>[0] & {
        themeVariant?: "light" | "dark";
      };

      androidPickerParams.themeVariant = scheme === "dark" ? "dark" : "light";

      DateTimePickerAndroid.open(androidPickerParams);
    } else {
      setIosDateDraft(reference > today ? today : reference);
      setDatePickerVisible(true);
    }
  };

  const handleDateCancel = () => {
    setDatePickerVisible(false);
  };

  const handleDateConfirm = () => {
    setDateFound(iosDateDraft > today ? today : iosDateDraft);
    setDatePickerVisible(false);
  };

  const handleIosDateChange = (selectedDate: Date) => {
    const nextDate = normalizeDate(selectedDate);
    setIosDateDraft(nextDate > today ? today : nextDate);
  };

  const handleOpenMap = () => {
    void openMapModal();
  };

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
    const isoDate = dateFound ? formatDateForApi(dateFound) : undefined;

    if (!trimmedName) {
      setErrorMessage("Item name is required.");
      return;
    }

    if (!category) {
      setErrorMessage("Select a category for the item.");
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
        dateFound: isoDate,
        latitude: selectedCoordinate?.latitude,
        longitude: selectedCoordinate?.longitude,
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
          <FormHeader
            styles={styles}
            palette={palette}
            onBack={() => router.back()}
          />

          <ItemDetailsSection
            styles={styles}
            placeholderColor={placeholderColor}
            itemName={itemName}
            onChangeItemName={setItemName}
            description={description}
            onChangeDescription={setDescription}
          />

          <LocationAndDateRow
            styles={styles}
            palette={palette}
            placeholderColor={placeholderColor}
            locationFound={locationFound}
            onChangeLocation={setLocationFound}
            onOpenMap={handleOpenMap}
            selectedCoordinate={selectedCoordinate}
            onClearCoordinate={clearSelectedCoordinate}
            locationError={locationError}
            isMapModalVisible={isMapModalVisible}
            dateFound={dateFound}
            onDatePress={openDatePicker}
            onClearDate={() => setDateFound(null)}
            formatDateForDisplay={formatDateForDisplay}
          />

          <CategorySection
            styles={styles}
            palette={palette}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          <PhotosSection
            styles={styles}
            palette={palette}
            images={images}
            onAddImage={handleAddImage}
            onRemoveImage={handleRemoveImage}
          />

          <ErrorBanner styles={styles} message={errorMessage} />

          <SubmitButton
            styles={styles}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
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

      {Platform.OS === "ios" ? (
        <IosDatePickerModal
          visible={isDatePickerVisible}
          iosDateDraft={iosDateDraft}
          today={today}
          scheme={scheme}
          onCancel={handleDateCancel}
          onConfirm={handleDateConfirm}
          onChange={handleIosDateChange}
          styles={styles}
        />
      ) : null}

      <MapLocationModal
        visible={isMapModalVisible}
        onClose={closeMapModal}
        styles={styles}
        palette={palette}
        mapRef={mapRef}
        mapRegion={mapRegion}
        hasLocationPermission={hasLocationPermission}
        selectedCoordinate={selectedCoordinate}
        onPressMap={handleMapPress}
        isLocating={isLocating}
        onConfirm={handleConfirmLocation}
        locationError={locationError}
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
    formSectionGroup: {
      gap: 16,
    },
    formSection: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    fieldHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    clearAction: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.primary,
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
    mapTrigger: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "android" ? 12 : 14,
      backgroundColor: palette.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    mapTriggerIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? "rgba(31,45,61,0.6)" : "rgba(229,240,255,0.9)",
    },
    mapTriggerContent: {
      flex: 1,
      gap: 2,
    },
    mapTriggerTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    mapTriggerSubtitle: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    mapTriggerClear: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
    },
    mapTriggerClearText: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    mapErrorText: {
      fontSize: 13,
      color: palette.danger,
      marginTop: 6,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "android" ? 12 : 14,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.96)",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dateValue: {
      fontSize: 15,
      color: palette.text,
      fontWeight: "500",
    },
    datePlaceholder: {
      fontSize: 15,
      color: scheme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
      fontWeight: "500",
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
    iosDateSheet: {
      marginHorizontal: 16,
      marginBottom: 32,
      borderRadius: 16,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
    },
    iosDateToolbar: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    iosDateButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.primary,
    },
    mapModalSafeArea: {
      flex: 1,
      backgroundColor: palette.background,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    mapModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    mapModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    mapModalClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    mapModalBody: {
      flex: 1,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: palette.border,
    },
    mapModalMap: {
      flex: 1,
    },
    mapOverlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      backgroundColor:
        scheme === "dark" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)",
    },
    mapLoadingText: {
      fontSize: 13,
      color: palette.textSecondary,
      fontWeight: "500",
    },
    mapModalFooter: {
      flexDirection: "row",
      marginTop: 16,
      gap: 12,
    },
    mapModalSecondary: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
    },
    mapModalSecondaryText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    mapModalPrimary: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
    },
    mapModalPrimaryDisabled: {
      opacity: 0.6,
    },
    mapModalPrimaryText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.surface,
    },
    mapModalError: {
      marginTop: 12,
      fontSize: 13,
      color: palette.danger,
      textAlign: "center",
    },
    mapModalHint: {
      marginTop: 12,
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: "center",
    },
  });
}

type ReportLostItemStyles = ReturnType<typeof createStyles>;

type FormHeaderProps = {
  styles: ReportLostItemStyles;
  palette: Palette;
  onBack: () => void;
};

function FormHeader({ styles, palette, onBack }: FormHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Report Lost Item</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

type ItemDetailsSectionProps = {
  styles: ReportLostItemStyles;
  placeholderColor: string;
  itemName: string;
  onChangeItemName: (value: string) => void;
  description: string;
  onChangeDescription: (value: string) => void;
};

function ItemDetailsSection({
  styles,
  placeholderColor,
  itemName,
  onChangeItemName,
  description,
  onChangeDescription,
}: ItemDetailsSectionProps) {
  return (
    <>
      <View style={styles.formSection}>
        <Text style={styles.label}>Item name *</Text>
        <TextInput
          value={itemName}
          onChangeText={onChangeItemName}
          style={styles.input}
          placeholder="What did you find?"
          placeholderTextColor={placeholderColor}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={onChangeDescription}
          style={[styles.input, styles.multilineInput]}
          placeholder="Describe the item, unique markings, etc."
          placeholderTextColor={placeholderColor}
          multiline
          numberOfLines={4}
        />
      </View>
    </>
  );
}

type LocationAndDateRowProps = {
  styles: ReportLostItemStyles;
  palette: Palette;
  placeholderColor: string;
  locationFound: string;
  onChangeLocation: (value: string) => void;
  onOpenMap: () => void;
  selectedCoordinate: LatLng | null;
  onClearCoordinate: () => void;
  locationError: string | null;
  isMapModalVisible: boolean;
  dateFound: Date | null;
  onDatePress: () => void;
  onClearDate: () => void;
  formatDateForDisplay: (value: Date | null) => string;
};

function LocationAndDateRow({
  styles,
  palette,
  placeholderColor,
  locationFound,
  onChangeLocation,
  onOpenMap,
  selectedCoordinate,
  onClearCoordinate,
  locationError,
  isMapModalVisible,
  dateFound,
  onDatePress,
  onClearDate,
  formatDateForDisplay,
}: LocationAndDateRowProps) {
  return (
    <View style={styles.formSectionGroup}>
      <View style={styles.formSection}>
        <Text style={styles.label}>Location found</Text>
        <TextInput
          value={locationFound}
          onChangeText={onChangeLocation}
          style={styles.input}
          placeholder="Where was it found?"
          placeholderTextColor={placeholderColor}
        />
        <TouchableOpacity
          style={styles.mapTrigger}
          onPress={onOpenMap}
          activeOpacity={0.85}
        >
          <View style={styles.mapTriggerIconWrapper}>
            <Ionicons
              name="location-outline"
              size={18}
              color={palette.primary}
            />
          </View>
          <View style={styles.mapTriggerContent}>
            <Text style={styles.mapTriggerTitle}>
              {selectedCoordinate
                ? "Update map location"
                : "Select location on map"}
            </Text>
            <Text style={styles.mapTriggerSubtitle}>
              {selectedCoordinate
                ? `Lat ${selectedCoordinate.latitude.toFixed(5)}, Lon ${selectedCoordinate.longitude.toFixed(5)}`
                : "Tap to drop a pin"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.textSecondary}
          />
        </TouchableOpacity>
        {selectedCoordinate ? (
          <TouchableOpacity
            onPress={onClearCoordinate}
            hitSlop={8}
            style={styles.mapTriggerClear}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={palette.textSecondary}
            />
            <Text style={styles.mapTriggerClearText}>Remove pin</Text>
          </TouchableOpacity>
        ) : null}
        {locationError && !isMapModalVisible ? (
          <Text style={styles.mapErrorText}>{locationError}</Text>
        ) : null}
      </View>

      <View style={styles.formSection}>
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>Date found</Text>
          {dateFound ? (
            <TouchableOpacity onPress={onClearDate} hitSlop={8}>
              <Text style={styles.clearAction}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={onDatePress}
          activeOpacity={0.85}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={palette.textSecondary}
          />
          <Text style={dateFound ? styles.dateValue : styles.datePlaceholder}>
            {formatDateForDisplay(dateFound)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type CategorySectionProps = {
  styles: ReportLostItemStyles;
  palette: Palette;
  selectedCategory: ItemCategory | null;
  onSelectCategory: (value: ItemCategory) => void;
};

function CategorySection({
  styles,
  palette,
  selectedCategory,
  onSelectCategory,
}: CategorySectionProps) {
  return (
    <View style={styles.formSection}>
      <Text style={styles.label}>Category *</Text>
      <View style={styles.categoryGrid}>
        {CATEGORY_OPTIONS.map((option) => {
          const isActive = selectedCategory === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.categoryCard,
                isActive && styles.categoryCardActive,
              ]}
              onPress={() => onSelectCategory(option.value)}
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
  );
}

type PhotosSectionProps = {
  styles: ReportLostItemStyles;
  palette: Palette;
  images: string[];
  onAddImage: () => void;
  onRemoveImage: (uri: string) => void;
};

function PhotosSection({
  styles,
  palette,
  images,
  onAddImage,
  onRemoveImage,
}: PhotosSectionProps) {
  return (
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
              onPress={() => onRemoveImage(uri)}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 5 ? (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={onAddImage}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={24} color={palette.primary} />
            <Text style={styles.addImageLabel}>Add photos</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

type ErrorBannerProps = {
  styles: ReportLostItemStyles;
  message: string | null;
};

function ErrorBanner({ styles, message }: ErrorBannerProps) {
  if (!message) {
    return null;
  }

  return <Text style={styles.errorText}>{message}</Text>;
}

type SubmitButtonProps = {
  styles: ReportLostItemStyles;
  isSubmitting: boolean;
  onSubmit: () => void;
};

function SubmitButton({ styles, isSubmitting, onSubmit }: SubmitButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
      activeOpacity={0.9}
      onPress={onSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.submitButtonLabel}>Submit report</Text>
      )}
    </TouchableOpacity>
  );
}

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

type IosDatePickerModalProps = {
  visible: boolean;
  iosDateDraft: Date;
  today: Date;
  scheme: "light" | "dark";
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (date: Date) => void;
  styles: ReportLostItemStyles;
};

function IosDatePickerModal({
  visible,
  iosDateDraft,
  today,
  scheme,
  onCancel,
  onConfirm,
  onChange,
  styles,
}: IosDatePickerModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.pickerOverlay} onPress={onCancel}>
        <View style={styles.iosDateSheet}>
          <View style={styles.iosDateToolbar}>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Text style={styles.iosDateButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} hitSlop={12}>
              <Text style={styles.iosDateButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={iosDateDraft}
            mode="date"
            display="spinner"
            maximumDate={today}
            textColor={scheme === "dark" ? "#fff" : undefined}
            onChange={(_event, selectedDate) => {
              if (selectedDate) {
                onChange(selectedDate);
              }
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

type MapLocationModalProps = {
  visible: boolean;
  onClose: () => void;
  styles: ReportLostItemStyles;
  palette: Palette;
  mapRef: React.MutableRefObject<MapView | null>;
  mapRegion: Region;
  hasLocationPermission: boolean;
  selectedCoordinate: LatLng | null;
  onPressMap: (event: MapPressEvent) => void;
  isLocating: boolean;
  onConfirm: () => void;
  locationError: string | null;
};

function MapLocationModal({
  visible,
  onClose,
  styles,
  palette,
  mapRef,
  mapRegion,
  hasLocationPermission,
  selectedCoordinate,
  onPressMap,
  isLocating,
  onConfirm,
  locationError,
}: MapLocationModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.mapModalSafeArea}>
        <View style={styles.mapModalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.mapModalClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.mapModalTitle}>Drop a pin</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.mapModalBody}>
          <MapView
            ref={(ref) => {
              mapRef.current = ref;
            }}
            style={styles.mapModalMap}
            initialRegion={mapRegion}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={
              Platform.OS === "android" && hasLocationPermission
            }
            onPress={onPressMap}
          >
            {selectedCoordinate ? (
              <Marker coordinate={selectedCoordinate} />
            ) : null}
          </MapView>
          {isLocating ? (
            <View style={styles.mapOverlay} pointerEvents="none">
              <ActivityIndicator color={palette.primary} />
              <Text style={styles.mapLoadingText}>Centering map…</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.mapModalFooter}>
          <TouchableOpacity
            style={styles.mapModalSecondary}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.mapModalSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mapModalPrimary,
              !selectedCoordinate && styles.mapModalPrimaryDisabled,
            ]}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={!selectedCoordinate}
          >
            <Text style={styles.mapModalPrimaryText}>Use this location</Text>
          </TouchableOpacity>
        </View>
        {locationError ? (
          <Text style={styles.mapModalError}>{locationError}</Text>
        ) : (
          <Text style={styles.mapModalHint}>
            Tap anywhere on the map to drop or reposition the pin.
          </Text>
        )}
      </SafeAreaView>
    </Modal>
  );
}
