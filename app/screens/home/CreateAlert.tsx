import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
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
  type MapType,
  type Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { createLostItemAlert } from "../../../src/api/alerts";
import { ApiError } from "../../../src/api/httpClient";
import { type ItemCategory } from "../../../src/api/items";
import { Palette, useAppTheme } from "../../../src/theme";

const CATEGORY_OPTIONS: { label: string; value: ItemCategory; icon: string }[] =
  [
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

const MAP_FOCUS_DELTA = 0.005;

const DEFAULT_REGION: Region = {
  latitude: 25.8318,
  longitude: 82.68242,
  latitudeDelta: MAP_FOCUS_DELTA,
  longitudeDelta: MAP_FOCUS_DELTA,
};

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function CreateAlert() {
  const router = useRouter();
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );
  const placeholderColor = useMemo(
    () => (scheme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"),
    [scheme],
  );

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const mapRef = useRef<MapView | null>(null);
  const iosDateValueRef = useRef<Date | null>(null);

  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [keywords, setKeywords] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [dateLost, setDateLost] = useState<Date | null>(null);
  const [iosDateDraft, setIosDateDraft] = useState<Date>(today);
  const [selectedCoordinate, setSelectedCoordinate] = useState<LatLng | null>(
    null,
  );
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapType, setMapType] = useState<MapType>("standard");
  const [isMapModalVisible, setMapModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    if (!isMapModalVisible || !mapRef.current) {
      return;
    }

    const targetRegion = selectedCoordinate
      ? {
          latitude: selectedCoordinate.latitude,
          longitude: selectedCoordinate.longitude,
          latitudeDelta: MAP_FOCUS_DELTA,
          longitudeDelta: MAP_FOCUS_DELTA,
        }
      : mapRegion;

    mapRef.current.animateToRegion(targetRegion, 250);
  }, [isMapModalVisible, selectedCoordinate, mapRegion]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/screens/home/Landing");
  };

  const handleToggleMapType = () => {
    setMapType((prev) => (prev === "hybrid" ? "standard" : "hybrid"));
  };

  const openMapModal = useCallback(async () => {
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
        setMapRegion((prev) => ({ ...prev }));
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion: Region = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: MAP_FOCUS_DELTA,
        longitudeDelta: MAP_FOCUS_DELTA,
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
      console.log("create-alert-map", error);
      setLocationError(
        "Couldn't fetch your location. Pan the map and tap to drop a pin.",
      );
      setMapRegion(DEFAULT_REGION);
      setHasLocationPermission(false);
    } finally {
      setIsLocating(false);
    }
  }, []);

  const closeMapModal = () => {
    setMapModalVisible(false);
    setIsLocating(false);
    mapRef.current = null;
  };

  const handleMapPress = (event: MapPressEvent) => {
    const point = event.nativeEvent.coordinate;
    const normalized: LatLng = {
      latitude: Number(point.latitude.toFixed(6)),
      longitude: Number(point.longitude.toFixed(6)),
    };
    setSelectedCoordinate(normalized);
    setMapRegion((prev) => ({
      ...prev,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
    }));
    setLocationError(null);
  };

  const handleConfirmLocation = () => {
    if (!selectedCoordinate) {
      setLocationError("Tap the map to drop a pin before confirming.");
      return;
    }
    setLocationError(null);
    closeMapModal();
  };

  const clearCoordinate = () => {
    setSelectedCoordinate(null);
    setLocationError(null);
  };

  const handleOpenDatePicker = () => {
    const reference = dateLost ?? today;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: reference,
        mode: "date",
        maximumDate: today,
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            setDateLost(normalizeDate(selectedDate));
          }
        },
      });
      return;
    }
    iosDateValueRef.current = reference;
    setIosDateDraft(reference);
    setDatePickerVisible(true);
  };

  const handleIosDateChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      const normalized = normalizeDate(selectedDate);
      iosDateValueRef.current = normalized;
      setIosDateDraft(normalized);
    }
  };

  const handleDateModalCancel = () => {
    setDatePickerVisible(false);
  };

  const handleDateModalConfirm = () => {
    if (iosDateValueRef.current) {
      setDateLost(normalizeDate(iosDateValueRef.current));
    }
    setDatePickerVisible(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!category) {
      Alert.alert("Select category", "Choose the item category to continue.");
      return;
    }

    const trimmedKeywords = keywords.trim();
    if (!trimmedKeywords) {
      setKeywordsError("Keywords are required.");
      Alert.alert(
        "Add keywords",
        "Describe the item with a few comma-separated keywords.",
      );
      return;
    }

    setKeywordsError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        category,
        keywords: trimmedKeywords,
        latitude: selectedCoordinate?.latitude ?? undefined,
        longitude: selectedCoordinate?.longitude ?? undefined,
        locationDescription: locationDescription.trim() || undefined,
        dateLost: dateLost ? formatDateForApi(dateLost) : undefined,
      };

      const response = await createLostItemAlert(payload);
      const message = response.message || "Alert created successfully.";
      Alert.alert("Alert active", message, [
        {
          text: "Great",
          onPress: () => {
            router.replace("/screens/home/Landing");
          },
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not create this alert right now.";
      Alert.alert("Unable to create alert", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />
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
              onPress={handleBack}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Create Lost Item Alert</Text>
            <View style={{ width: 32 }} />
          </View>

          <View style={styles.introCard}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={palette.primary}
            />
            <View style={styles.introTextWrapper}>
              <Text style={styles.introTitle}>Stay in the loop</Text>
              <Text style={styles.introSubtitle}>
                We&apos;ll let you know as soon as a matching item is reported.
              </Text>
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
                      isActive ? styles.categoryCardActive : null,
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
                        isActive ? styles.categoryLabelActive : null,
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
            <Text style={styles.label}>Keywords *</Text>
            <TextInput
              value={keywords}
              onChangeText={setKeywords}
              style={[styles.input, keywordsError ? styles.inputError : null]}
              placeholder="black, leather, Fossil brand"
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
            />
            {keywordsError ? (
              <Text style={styles.inputErrorText}>{keywordsError}</Text>
            ) : null}
            <Text style={styles.hint}>
              Separate words with commas. Include colors, brands, or unique
              marks.
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              value={locationDescription}
              onChangeText={setLocationDescription}
              style={styles.input}
              placeholder="Near Central Library, outside main gate"
              placeholderTextColor={placeholderColor}
              autoCapitalize="sentences"
            />
            <TouchableOpacity
              style={styles.mapTrigger}
              onPress={() => void openMapModal()}
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
                    ? "Update map pin"
                    : "Drop a pin on the map"}
                </Text>
                <Text style={styles.mapTriggerSubtitle}>
                  {selectedCoordinate
                    ? `Lat ${selectedCoordinate.latitude.toFixed(5)}, Lon ${selectedCoordinate.longitude.toFixed(5)}`
                    : "Tap to open the campus map"}
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
                style={styles.mapTriggerClear}
                onPress={clearCoordinate}
                hitSlop={8}
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
              <Text style={styles.label}>Date lost (optional)</Text>
              {dateLost ? (
                <TouchableOpacity onPress={() => setDateLost(null)} hitSlop={8}>
                  <Text style={styles.clearAction}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={handleOpenDatePicker}
              activeOpacity={0.85}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={palette.textSecondary}
              />
              <Text
                style={dateLost ? styles.dateValue : styles.datePlaceholder}
              >
                {dateLost ? formatDateForDisplay(dateLost) : "Select date"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={palette.surface} />
            ) : (
              <Text style={styles.submitButtonLabel}>Set alert</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <MapLocationModal
        visible={isMapModalVisible}
        onClose={closeMapModal}
        palette={palette}
        styles={styles}
        mapRef={mapRef}
        mapRegion={mapRegion}
        mapType={mapType}
        hasLocationPermission={hasLocationPermission}
        selectedCoordinate={selectedCoordinate}
        onPressMap={handleMapPress}
        isLocating={isLocating}
        onConfirm={handleConfirmLocation}
        onToggleMapType={handleToggleMapType}
        locationError={locationError}
      />

      {Platform.OS === "ios" ? (
        <Modal
          transparent
          visible={isDatePickerVisible}
          animationType="slide"
          onRequestClose={handleDateModalCancel}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={handleDateModalCancel}
          >
            <View style={styles.iosDateSheet}>
              <View style={styles.iosDateToolbar}>
                <TouchableOpacity onPress={handleDateModalCancel} hitSlop={12}>
                  <Text style={styles.iosDateButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDateModalConfirm} hitSlop={12}>
                  <Text style={styles.iosDateButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosDateDraft}
                mode="date"
                display="spinner"
                maximumDate={today}
                onChange={handleIosDateChange}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

type CreateAlertStyles = ReturnType<typeof createStyles>;

type MapLocationModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: Palette;
  styles: CreateAlertStyles;
  mapRef: React.MutableRefObject<MapView | null>;
  mapRegion: Region;
  mapType: MapType;
  hasLocationPermission: boolean;
  selectedCoordinate: LatLng | null;
  onPressMap: (event: MapPressEvent) => void;
  isLocating: boolean;
  onConfirm: () => void;
  onToggleMapType: () => void;
  locationError: string | null;
};

function MapLocationModal({
  visible,
  onClose,
  palette,
  styles,
  mapRef,
  mapRegion,
  mapType,
  hasLocationPermission,
  selectedCoordinate,
  onPressMap,
  isLocating,
  onConfirm,
  onToggleMapType,
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
          <TouchableOpacity
            onPress={onToggleMapType}
            style={styles.mapModeToggle}
            hitSlop={8}
            activeOpacity={0.85}
          >
            <Ionicons
              name={mapType === "hybrid" ? "map-outline" : "earth-outline"}
              size={16}
              color={palette.primary}
            />
            <Text style={styles.mapModeToggleLabel}>
              {mapType === "hybrid" ? "Standard view" : "Satellite view"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mapModalBody}>
          <MapView
            ref={(ref) => {
              mapRef.current = ref;
            }}
            style={styles.mapModalMap}
            initialRegion={mapRegion}
            mapType={mapType}
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

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
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
    introCard: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor:
        scheme === "dark" ? "rgba(17,24,39,0.8)" : "rgba(248,250,252,0.96)",
      padding: 16,
    },
    introTextWrapper: {
      flex: 1,
      gap: 4,
    },
    introTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: palette.text,
    },
    introSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    formSection: {
      gap: 12,
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
      fontSize: 15,
      color: palette.text,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.96)",
    },
    inputError: {
      borderColor: palette.danger,
    },
    inputErrorText: {
      fontSize: 12,
      color: palette.danger,
    },
    hint: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    categoryCard: {
      width: "30%",
      minWidth: 100,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      paddingVertical: 14,
      alignItems: "center",
      gap: 8,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.96)",
    },
    categoryCardActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    categoryLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.primary,
      textAlign: "center",
    },
    categoryLabelActive: {
      color: palette.surface,
    },
    mapTrigger: {
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
    },
    mapTriggerClearText: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    mapErrorText: {
      fontSize: 12,
      color: palette.danger,
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
    dateInput: {
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
    datePlaceholder: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    dateValue: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    submitButton: {
      marginTop: 4,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: scheme === "dark" ? 0.3 : 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.surface,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    iosDateSheet: {
      width: "100%",
      backgroundColor: palette.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 16,
    },
    iosDateToolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    iosDateButtonText: {
      fontSize: 16,
      color: palette.primary,
    },
    mapModalSafeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    mapModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    mapModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    mapModalClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    mapModeToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor:
        scheme === "dark" ? "rgba(31,45,61,0.6)" : "rgba(229,240,255,0.9)",
    },
    mapModeToggleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.primary,
    },
    mapModalBody: {
      flex: 1,
    },
    mapModalMap: {
      flex: 1,
    },
    mapOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: "rgba(15,23,42,0.25)",
    },
    mapLoadingText: {
      fontSize: 13,
      color: palette.surface,
    },
    mapModalFooter: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    mapModalSecondary: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      backgroundColor: palette.background,
    },
    mapModalSecondaryText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    mapModalPrimary: {
      flex: 1,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      backgroundColor: palette.primary,
    },
    mapModalPrimaryDisabled: {
      opacity: 0.5,
    },
    mapModalPrimaryText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.surface,
    },
    mapModalError: {
      marginHorizontal: 20,
      marginBottom: 12,
      fontSize: 13,
      color: palette.danger,
      textAlign: "center",
    },
    mapModalHint: {
      marginHorizontal: 20,
      marginBottom: 12,
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: "center",
    },
  });
}

function normalizeDate(value: Date) {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatDateForDisplay(value: Date) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateForApi(value: Date) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${year}-${month}-${day}`;
}
