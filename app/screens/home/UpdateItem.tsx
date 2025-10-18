import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  Keyboard,
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
import { ApiError } from "../../../src/api/httpClient";
import {
  fetchLostItemById,
  updateLostItem,
  type ItemCategory,
  type LostItemDetail,
} from "../../../src/api/items";
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

const CAMPUS_LOCATIONS: string[] = [
  "Administrative Building (Prashasan Bhawan)",
  "Examination Building",
  "University Guest House",
  "Vivekananda Central Library",
  "Prof. Rajendra Singh (Rajju Bhaiya) Institute of Physical Sciences for Study & Research",
  "Faculty of Management Studies (FMS)",
  "Institute of Pharmacy",
  "Dattopant Thengadi Law Institute",
  "Computer Centre",
  "Department of Mass Communication",
  "Aryabhatt Auditorium",
  "Eklavya Stadium",
  "University Canteen",
  "Dr. C.V. Raman Boys Hostel",
  "Vishwakarma Boys Hostel",
  "Charak Boys Hostel",
  "Meerabai Girls Hostel",
  "Draupadi Girls Hostel",
  "University Main Gate",
  "Temple",
  "Rani Laxmibai Girls Hostel",
  "Srinivasan Ramanujan Hostel",
  "Transit & Gangotri Awas Hostel",
  "ShriNivas Ramanujan Anushandhan Bhawan Hostel",
  "Sarovar",
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

export default function UpdateItem() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const numericId = useMemo(() => {
    if (!rawId) {
      return null;
    }
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [rawId]);

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
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapType, setMapType] = useState<MapType>("standard");
  const [selectedCoordinate, setSelectedCoordinate] = useState<LatLng | null>(
    null,
  );
  const [isMapModalVisible, setMapModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const iosDatePickerRef = useRef<Date | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [locationInputError, setLocationInputError] = useState<string | null>(
    null,
  );
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [dateFound, setDateFound] = useState<Date | null>(null);
  const [iosDateDraft, setIosDateDraft] = useState<Date>(today);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [postedBy, setPostedBy] = useState<LostItemDetail["postedBy"]>();

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

  const loadItem = useCallback(async () => {
    if (!numericId) {
      setErrorMessage("Item not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchLostItemById(numericId);
      setItemName(data.itemName ?? "");
      setDescription(data.description ?? "");
      setLocationFound(data.locationFound ?? "");
      setCategory(data.category ?? null);
      const parsedDate = parseDateString(data.dateFound);
      setDateFound(parsedDate);
      setIosDateDraft(parsedDate ?? today);
      const latitudeValue =
        typeof data.latitude === "number" && Number.isFinite(data.latitude)
          ? data.latitude
          : null;
      const longitudeValue =
        typeof data.longitude === "number" && Number.isFinite(data.longitude)
          ? data.longitude
          : null;
      setLatitudeInput(latitudeValue !== null ? latitudeValue.toFixed(6) : "");
      setLongitudeInput(
        longitudeValue !== null ? longitudeValue.toFixed(6) : "",
      );
      setSelectedCoordinate(() => {
        if (latitudeValue === null || longitudeValue === null) {
          return null;
        }
        return {
          latitude: latitudeValue,
          longitude: longitudeValue,
        };
      });
      if (latitudeValue !== null && longitudeValue !== null) {
        setMapRegion({
          latitude: latitudeValue,
          longitude: longitudeValue,
          latitudeDelta: MAP_FOCUS_DELTA,
          longitudeDelta: MAP_FOCUS_DELTA,
        });
      }
      setImages(sanitizeImageUris(data.images));
      setPostedBy(data.postedBy ?? undefined);
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load item for editing.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [numericId, today]);

  useEffect(() => {
    loadItem().catch(() => {
      // handled in loadItem
    });
  }, [loadItem]);

  const handleRetry = () => {
    loadItem().catch(() => {
      // handled in loadItem
    });
  };

  const handleLocationChange = (value: string) => {
    setLocationFound(value);
    if (locationInputError && value.trim()) {
      setLocationInputError(null);
    }
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
      console.warn("update-item-map", error);
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
    const { coordinate } = event.nativeEvent;
    const normalized: LatLng = {
      latitude: Number(coordinate.latitude.toFixed(6)),
      longitude: Number(coordinate.longitude.toFixed(6)),
    };
    setSelectedCoordinate(normalized);
    setMapRegion((prev) => ({
      ...prev,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
    }));
    setLocationError(null);
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === "hybrid" ? "standard" : "hybrid"));
  };

  const handleConfirmLocation = () => {
    if (!selectedCoordinate) {
      setLocationError("Tap the map to drop a pin before confirming.");
      return;
    }
    setLatitudeInput(selectedCoordinate.latitude.toFixed(6));
    setLongitudeInput(selectedCoordinate.longitude.toFixed(6));
    setLocationError(null);
    closeMapModal();
  };

  const clearSelectedCoordinate = () => {
    setSelectedCoordinate(null);
    setLatitudeInput("");
    setLongitudeInput("");
    setLocationError(null);
  };

  const handleOpenDatePicker = () => {
    const reference = dateFound ?? today;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: reference,
        mode: "date",
        is24Hour: true,
        maximumDate: today,
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            setDateFound(normalizeDate(selectedDate));
          }
        },
      });
      return;
    }

    iosDatePickerRef.current = reference;
    setIosDateDraft(reference);
    setDatePickerVisible(true);
  };

  const handleDateModalCancel = () => {
    setDatePickerVisible(false);
  };

  const handleDateModalConfirm = () => {
    if (iosDatePickerRef.current) {
      setDateFound(normalizeDate(iosDatePickerRef.current));
    }
    setDatePickerVisible(false);
  };

  const handleIosDateChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      const normalized = normalizeDate(selectedDate);
      iosDatePickerRef.current = normalized;
      setIosDateDraft(normalized);
    }
  };

  const handleSubmit = async () => {
    if (!numericId) {
      return;
    }

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      Alert.alert("Missing name", "Please provide a name for the item.");
      return;
    }
    if (!category) {
      Alert.alert("Missing category", "Please choose a category.");
      return;
    }

    const trimmedLocation = locationFound.trim();
    if (!trimmedLocation) {
      setLocationInputError("Location is required.");
      Alert.alert(
        "Missing location",
        "Please specify where the item was found.",
      );
      return;
    }

    const latitudeNumber = parseCoordinate(latitudeInput);
    if (latitudeInput.trim() && latitudeNumber === null) {
      Alert.alert("Invalid latitude", "Enter a valid latitude value.");
      return;
    }
    const longitudeNumber = parseCoordinate(longitudeInput);
    if (longitudeInput.trim() && longitudeNumber === null) {
      Alert.alert("Invalid longitude", "Enter a valid longitude value.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateLostItem(numericId, {
        itemName: trimmedName,
        description,
        locationFound: trimmedLocation,
        category,
        dateFound: dateFound ? formatDateForApi(dateFound) : null,
        latitude: latitudeNumber,
        longitude: longitudeNumber,
      });

      if (response.data) {
        setImages(sanitizeImageUris(response.data.images));
      }

      const message = response.message || "Item updated successfully.";
      Alert.alert("Success", message, [
        {
          text: "View item",
          onPress: () => {
            router.replace({
              pathname: "/screens/home/ItemDetail",
              params: { id: String(numericId) },
            });
          },
        },
        {
          text: "Stay here",
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to update the item right now.";
      Alert.alert("Update failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/screens/home/Landing");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.centerStateLabel}>Loading item…</Text>
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <View style={styles.centerState}>
          <Ionicons name="warning-outline" size={48} color={palette.danger} />
          <Text style={styles.centerStateTitle}>Couldn&apos;t load item</Text>
          <Text style={styles.centerStateLabel}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={palette.surface} />
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isLoading && !errorMessage ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FormHeader styles={styles} palette={palette} onBack={handleBack} />

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
              onChangeLocation={handleLocationChange}
              campusLocations={CAMPUS_LOCATIONS}
              locationInputError={locationInputError}
              onOpenMap={() => void openMapModal()}
              selectedCoordinate={selectedCoordinate}
              onClearCoordinate={clearSelectedCoordinate}
              locationError={locationError}
              isMapModalVisible={isMapModalVisible}
              dateFound={dateFound}
              onDatePress={handleOpenDatePicker}
              onClearDate={() => setDateFound(null)}
              formatDateForDisplay={formatDateForDisplay}
            />

            <CategorySection
              styles={styles}
              palette={palette}
              selectedCategory={category}
              onSelectCategory={setCategory}
            />

            <CoordinateSection
              styles={styles}
              placeholderColor={placeholderColor}
              latitudeInput={latitudeInput}
              onChangeLatitude={setLatitudeInput}
              longitudeInput={longitudeInput}
              onChangeLongitude={setLongitudeInput}
            />

            <PhotosSection styles={styles} palette={palette} images={images} />

            <PostedBySection
              styles={styles}
              palette={palette}
              postedBy={postedBy}
            />

            <ErrorBanner styles={styles} message={null} />

            <SubmitButton
              styles={styles}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      {Platform.OS === "ios" ? (
        <IosDatePickerModal
          visible={isDatePickerVisible}
          iosDateDraft={iosDateDraft}
          today={today}
          scheme={scheme}
          onCancel={handleDateModalCancel}
          onConfirm={handleDateModalConfirm}
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
        mapType={mapType}
        hasLocationPermission={hasLocationPermission}
        selectedCoordinate={selectedCoordinate}
        onPressMap={handleMapPress}
        isLocating={isLocating}
        onConfirm={handleConfirmLocation}
        locationError={locationError}
        onToggleMapType={toggleMapType}
      />
    </SafeAreaView>
  );
}

type UpdateItemStyles = ReturnType<typeof createStyles>;

type FormHeaderProps = {
  styles: UpdateItemStyles;
  palette: Palette;
  onBack: () => void;
};

function FormHeader({ styles, palette, onBack }: FormHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </TouchableOpacity>
      <Text style={styles.title}>Update Item</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

type ItemDetailsSectionProps = {
  styles: UpdateItemStyles;
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
    <View style={styles.formSectionGroup}>
      <View style={styles.formSection}>
        <Text style={styles.label}>Item name *</Text>
        <TextInput
          value={itemName}
          onChangeText={onChangeItemName}
          style={styles.input}
          placeholder="What was found?"
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
    </View>
  );
}

type LocationAndDateRowProps = {
  styles: UpdateItemStyles;
  palette: Palette;
  placeholderColor: string;
  locationFound: string;
  onChangeLocation: (value: string) => void;
  campusLocations: string[];
  locationInputError: string | null;
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
  campusLocations,
  locationInputError,
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
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredLocations = useMemo(() => {
    const query = locationFound.trim().toLowerCase();
    if (!query) {
      return campusLocations;
    }
    return campusLocations.filter((location) =>
      location.toLowerCase().includes(query),
    );
  }, [campusLocations, locationFound]);

  const handleSelectSuggestion = (value: string) => {
    onChangeLocation(value);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 120);
  };

  return (
    <View style={styles.formSectionGroup}>
      <View style={styles.formSection}>
        <Text style={styles.label}>Location found *</Text>
        <TextInput
          value={locationFound}
          onChangeText={onChangeLocation}
          style={[styles.input, locationInputError ? styles.inputError : null]}
          placeholder="Where was it found?"
          placeholderTextColor={placeholderColor}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {locationInputError ? (
          <Text style={styles.inputErrorText}>{locationInputError}</Text>
        ) : null}
        {showSuggestions ? (
          <View style={styles.locationSuggestionsBox}>
            {filteredLocations.length > 0 ? (
              <ScrollView
                style={styles.locationSuggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filteredLocations.map((location, index) => {
                  const isActive =
                    locationFound.trim().toLowerCase() ===
                    location.toLowerCase();
                  const isLast = index === filteredLocations.length - 1;
                  return (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.locationSuggestionItem,
                        isLast ? styles.locationSuggestionItemLast : null,
                      ]}
                      onPress={() => handleSelectSuggestion(location)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={
                          isActive ? palette.primary : palette.textSecondary
                        }
                        style={styles.locationSuggestionIcon}
                      />
                      <Text
                        style={[
                          styles.locationSuggestionText,
                          isActive ? styles.locationSuggestionTextActive : null,
                        ]}
                      >
                        {location}
                      </Text>
                      {isActive ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={palette.primary}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.locationSuggestionEmptyState}>
                <Text style={styles.locationSuggestionEmptyText}>
                  No matching campus locations.
                </Text>
              </View>
            )}
          </View>
        ) : null}
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
  styles: UpdateItemStyles;
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

type CoordinateSectionProps = {
  styles: UpdateItemStyles;
  placeholderColor: string;
  latitudeInput: string;
  onChangeLatitude: (value: string) => void;
  longitudeInput: string;
  onChangeLongitude: (value: string) => void;
};

function CoordinateSection({
  styles,
  placeholderColor,
  latitudeInput,
  onChangeLatitude,
  longitudeInput,
  onChangeLongitude,
}: CoordinateSectionProps) {
  return <></>;
}

type PhotosSectionProps = {
  styles: UpdateItemStyles;
  palette: Palette;
  images: string[];
};

function PhotosSection({ styles, palette, images }: PhotosSectionProps) {
  if (!images.length) {
    return (
      <View style={styles.formSection}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.hint}>No photos available for this item.</Text>
      </View>
    );
  }

  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.hint}>
          Photos attached when the item was reported.
        </Text>
      </View>
      <View style={styles.imageGrid}>
        {images.map((uri) => (
          <View key={uri} style={styles.imageWrapper}>
            <Image
              source={{ uri }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          </View>
        ))}
      </View>
      <Text style={[styles.hint, styles.photosHint]}>
        Editing item photos will be available soon.
      </Text>
    </View>
  );
}

type PostedBySectionProps = {
  styles: UpdateItemStyles;
  palette: Palette;
  postedBy: LostItemDetail["postedBy"] | undefined;
};

function PostedBySection({ styles, palette, postedBy }: PostedBySectionProps) {
  if (!postedBy?.name) {
    return null;
  }

  return <></>;
}

type ErrorBannerProps = {
  styles: UpdateItemStyles;
  message: string | null;
};

function ErrorBanner({ styles, message }: ErrorBannerProps) {
  if (!message) {
    return null;
  }
  return <Text style={styles.errorText}>{message}</Text>;
}

type SubmitButtonProps = {
  styles: UpdateItemStyles;
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
        <Text style={styles.submitButtonLabel}>Save changes</Text>
      )}
    </TouchableOpacity>
  );
}

type IosDatePickerModalProps = {
  visible: boolean;
  iosDateDraft: Date;
  today: Date;
  scheme: "light" | "dark";
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (event: unknown, date?: Date) => void;
  styles: UpdateItemStyles;
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
            onChange={onChange}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

type MapLocationModalProps = {
  visible: boolean;
  onClose: () => void;
  styles: UpdateItemStyles;
  palette: Palette;
  mapRef: React.MutableRefObject<MapView | null>;
  mapRegion: Region;
  mapType: MapType;
  hasLocationPermission: boolean;
  selectedCoordinate: LatLng | null;
  onPressMap: (event: MapPressEvent) => void;
  isLocating: boolean;
  onConfirm: () => void;
  locationError: string | null;
  onToggleMapType: () => void;
};

function MapLocationModal({
  visible,
  onClose,
  styles,
  palette,
  mapRef,
  mapRegion,
  mapType,
  hasLocationPermission,
  selectedCoordinate,
  onPressMap,
  isLocating,
  onConfirm,
  locationError,
  onToggleMapType,
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
    inputError: {
      borderColor: palette.danger,
    },
    inputErrorText: {
      marginTop: 6,
      fontSize: 12,
      color: palette.danger,
    },
    multilineInput: {
      minHeight: 100,
      textAlignVertical: "top",
    },
    locationSuggestionsBox: {
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      maxHeight: 220,
      overflow: "hidden",
    },
    locationSuggestionsScroll: {
      maxHeight: 220,
    },
    locationSuggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    locationSuggestionItemLast: {
      borderBottomWidth: 0,
    },
    locationSuggestionIcon: {
      marginRight: 16,
    },
    locationSuggestionText: {
      flex: 1,
      fontSize: 14,
      color: palette.text,
    },
    locationSuggestionTextActive: {
      fontWeight: "700",
      color: palette.primary,
    },
    locationSuggestionEmptyState: {
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    locationSuggestionEmptyText: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    mapTrigger: {
      marginTop: 12,
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
      marginTop: 8,
      fontSize: 12,
      color: palette.danger,
    },
    dateInput: {
      marginTop: 12,
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
    coordinateRow: {
      flexDirection: "row",
      gap: 12,
    },
    coordinateColumn: {
      flex: 1,
      gap: 8,
    },
    coordinateLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
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
    photosHint: {
      marginTop: 8,
      textAlign: "center",
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
      backgroundColor: palette.border,
    },
    imagePreview: {
      width: "100%",
      height: "100%",
    },
    postedByRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    postedByAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    postedByAvatarImage: {
      width: "100%",
      height: "100%",
    },
    postedByName: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    errorText: {
      marginTop: 12,
      fontSize: 13,
      color: palette.danger,
      textAlign: "center",
    },
    submitButton: {
      marginTop: 8,
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
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 16,
    },
    centerStateLabel: {
      fontSize: 14,
      color: palette.textSecondary,
      textAlign: "center",
    },
    centerStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
      textAlign: "center",
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      backgroundColor: palette.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryButtonLabel: {
      fontSize: 14,
      fontWeight: "600",
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

function parseDateString(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return normalizeDate(parsed);
}

function formatDateForDisplay(value: Date | null) {
  if (!value) {
    return "Select date";
  }
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateForApi(value: Date) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function parseCoordinate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function sanitizeImageUris(images?: string[] | null): string[] {
  if (!images || images.length === 0) {
    return [];
  }
  return images.filter((uri) => uri && uri.startsWith("http"));
}
