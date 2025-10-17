import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
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
  FlatList,
  Keyboard,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../src/api/httpClient";
import {
  fetchLostItems,
  type FetchLostItemsParams,
  type ItemCategory,
  type ItemStatus,
  type LostItemSummary,
} from "../../../src/api/items";
import { Palette, useAppTheme } from "../../../src/theme";
import { LostItemCard } from "./components/LostItemCard";

type IconName = keyof typeof Ionicons.glyphMap;

type DateRangeOption = "any" | "today" | "this_week" | "this_month" | "custom";

type SearchFilters = {
  categories: ItemCategory[];
  dateRange: DateRangeOption;
  customFrom: Date | null;
  customTo: Date | null;
  status: ItemStatus | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

type PageState = {
  page: number;
  totalPages: number;
  totalElements: number;
  last: boolean;
};

type IosDatePickerState = {
  visible: boolean;
  target: "from" | "to";
  baseDate: Date;
};

const CATEGORY_OPTIONS: {
  label: string;
  value: ItemCategory | null;
  icon: IconName;
}[] = [
  { label: "All categories", value: null, icon: "grid-outline" },
  { label: "Phone", value: "PHONE", icon: "phone-portrait-outline" },
  { label: "Wallet", value: "WALLET", icon: "card-outline" },
  { label: "Keys", value: "KEYS", icon: "key-outline" },
  { label: "Bag", value: "BAG", icon: "briefcase-outline" },
  { label: "Electronic", value: "ELECTRONIC", icon: "flash-outline" },
  { label: "Clothing", value: "CLOTHING", icon: "shirt-outline" },
  { label: "Stationery", value: "STATIONERY", icon: "create-outline" },
  { label: "Document", value: "DOCUMENT", icon: "document-text-outline" },
  { label: "Other", value: "OTHER", icon: "color-wand-outline" },
];

const CATEGORY_VALUE_SET = new Set<ItemCategory>(
  CATEGORY_OPTIONS.reduce<ItemCategory[]>((acc, option) => {
    if (option.value) {
      acc.push(option.value);
    }
    return acc;
  }, []),
);

type StatusOption = {
  label: string;
  value: ItemStatus | null;
  icon: IconName;
  accent?: "claimed";
};

const STATUS_OPTIONS: StatusOption[] = [
  { label: "Any status", value: null, icon: "layers-outline" },
  { label: "Available", value: "AVAILABLE", icon: "checkmark-circle-outline" },
  {
    label: "Claimed",
    value: "CLAIMED",
    icon: "ribbon-outline",
    accent: "claimed",
  },
];

const STATUS_FILTER_VALUES: ItemStatus[] = STATUS_OPTIONS.reduce<ItemStatus[]>(
  (acc, option) => {
    if (option.value) {
      acc.push(option.value);
    }
    return acc;
  },
  [],
);

const DATE_RANGE_OPTIONS: {
  label: string;
  value: DateRangeOption;
  icon: IconName;
}[] = [
  { label: "Any time", value: "any", icon: "infinite-outline" },
  { label: "Today", value: "today", icon: "sunny-outline" },
  { label: "This week", value: "this_week", icon: "calendar-outline" },
  { label: "This month", value: "this_month", icon: "calendar-outline" },
  { label: "Custom range", value: "custom", icon: "calendar-clear-outline" },
];

const SORT_OPTIONS: {
  label: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  icon: IconName;
}[] = [
  {
    label: "Newest first",
    sortBy: "dateFound",
    sortOrder: "desc",
    icon: "arrow-down-circle-outline",
  },
  {
    label: "Oldest first",
    sortBy: "dateFound",
    sortOrder: "asc",
    icon: "arrow-up-circle-outline",
  },
  {
    label: "Name A→Z",
    sortBy: "itemName",
    sortOrder: "asc",
    icon: "swap-vertical-outline",
  },
  {
    label: "Name Z→A",
    sortBy: "itemName",
    sortOrder: "desc",
    icon: "swap-vertical-outline",
  },
];

const DEFAULT_SORT_OPTION = SORT_OPTIONS[0];
const PAGE_SIZE = 10;

const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  dateRange: "any",
  customFrom: null,
  customTo: null,
  status: null,
  sortBy: DEFAULT_SORT_OPTION.sortBy,
  sortOrder: DEFAULT_SORT_OPTION.sortOrder,
};

export default function SearchItems() {
  const { palette, scheme } = useAppTheme();
  const { category: categoryParam } = useLocalSearchParams<{
    category?: string | string[];
  }>();
  const router = useRouter();

  const incomingCategory = useMemo(() => {
    if (!categoryParam) {
      return null;
    }
    const raw = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
    if (typeof raw !== "string" || raw.length === 0) {
      return null;
    }
    const normalized = raw.toUpperCase();
    return isItemCategoryValue(normalized)
      ? (normalized as ItemCategory)
      : null;
  }, [categoryParam]);

  const styles = useMemo(
    () => createStyles(palette, scheme),
    [palette, scheme],
  );

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchInput.trim(), 350);

  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    categories: incomingCategory ? [incomingCategory] : [],
  }));
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    categories: incomingCategory ? [incomingCategory] : [],
  }));
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const [items, setItems] = useState<LostItemSummary[]>([]);
  const [pageState, setPageState] = useState<PageState>({
    page: 0,
    totalPages: 0,
    totalElements: 0,
    last: true,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [iosDatePickerState, setIosDatePickerState] =
    useState<IosDatePickerState>({
      visible: false,
      target: "from",
      baseDate: new Date(),
    });

  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAppliedRouteCategoryRef = useRef(false);
  const filtersRef = useRef<SearchFilters>(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    if (filters.status && !STATUS_FILTER_VALUES.includes(filters.status)) {
      setFilters((prev) => ({ ...prev, status: null }));
    }
  }, [filters.status]);

  useEffect(() => {
    if (
      draftFilters.status &&
      !STATUS_FILTER_VALUES.includes(draftFilters.status)
    ) {
      setDraftFilters((prev) => ({ ...prev, status: null }));
    }
  }, [draftFilters.status]);

  useEffect(() => {
    if (isFilterModalVisible) {
      setDraftFilters({ ...filters });
      setCustomRangeError(null);
    }
  }, [filters, isFilterModalVisible]);

  useEffect(() => {
    if (!incomingCategory) {
      hasAppliedRouteCategoryRef.current = false;
      return;
    }

    const currentFilters = filtersRef.current;
    const alreadySelected =
      currentFilters.categories.length === 1 &&
      currentFilters.categories[0] === incomingCategory;

    if (!hasAppliedRouteCategoryRef.current) {
      hasAppliedRouteCategoryRef.current = true;
      if (alreadySelected) {
        return;
      }
    } else if (alreadySelected) {
      return;
    }

    setSearchInput("");
    setFilters({
      ...DEFAULT_FILTERS,
      categories: [incomingCategory],
    });
    setDraftFilters({
      ...DEFAULT_FILTERS,
      categories: [incomingCategory],
    });
  }, [incomingCategory]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const buildParams = useCallback(
    (page: number): FetchLostItemsParams => {
      const params: FetchLostItemsParams = {
        page,
        size: PAGE_SIZE,
      };

      if (debouncedSearchTerm) {
        params.searchTerm = debouncedSearchTerm;
      }

      if (filters.categories.length > 0) {
        params.category = filters.categories;
      }

      const dateRangeParam = buildDateRangeQuery(filters);
      if (dateRangeParam) {
        params.dateRange = dateRangeParam;
      }

      if (filters.status) {
        params.status = filters.status;
      }

      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;

      return params;
    },
    [debouncedSearchTerm, filters],
  );

  const fetchPage = useCallback(
    async (
      page: number,
      mode: "replace" | "append" | "refresh" = "replace",
    ) => {
      if (mode === "append" && pageState.last) {
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (mode === "append") {
        setIsLoadingMore(true);
      } else if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const params = buildParams(page);
        const data = await fetchLostItems(params, {
          signal: controller.signal,
        });

        setPageState({
          page: data.page,
          totalPages: data.totalPages,
          totalElements: data.totalElements,
          last: data.last,
        });

        setItems((prev) =>
          mode === "append" ? [...prev, ...data.items] : data.items,
        );
        setErrorMessage(null);
      } catch (error) {
        const isCancelled =
          error instanceof ApiError &&
          error.cause instanceof Error &&
          error.cause.name === "CanceledError";
        if (isCancelled) {
          return;
        }

        if (mode !== "append") {
          setItems([]);
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Unable to fetch items right now.",
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }

        if (mode === "append") {
          setIsLoadingMore(false);
        } else if (mode === "refresh") {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [buildParams, pageState.last],
  );

  useEffect(() => {
    fetchPage(0, "replace");
  }, [fetchPage]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing || isInitialLoading) {
      return;
    }
    fetchPage(0, "refresh");
  }, [fetchPage, isInitialLoading, isRefreshing]);

  const handleLoadMore = useCallback(() => {
    if (isInitialLoading || isLoadingMore || pageState.last) {
      return;
    }

    fetchPage(pageState.page + 1, "append");
  }, [fetchPage, isInitialLoading, isLoadingMore, pageState]);

  const filtersActive = useMemo(() => {
    return (
      filters.categories.length > 0 ||
      filters.dateRange !== "any" ||
      filters.status !== null ||
      filters.sortBy !== DEFAULT_SORT_OPTION.sortBy ||
      filters.sortOrder !== DEFAULT_SORT_OPTION.sortOrder
    );
  }, [filters]);

  const totalResultsLabel = useMemo(() => {
    if (isInitialLoading) {
      return "";
    }
    if (pageState.totalElements === 0) {
      return "No matches";
    }
    return `${pageState.totalElements} item${
      pageState.totalElements === 1 ? "" : "s"
    } found`;
  }, [isInitialLoading, pageState.totalElements]);

  const handleApplyFilters = () => {
    if (draftFilters.dateRange === "custom") {
      if (!draftFilters.customFrom || !draftFilters.customTo) {
        setCustomRangeError("Select both start and end dates.");
        return;
      }

      if (draftFilters.customFrom > draftFilters.customTo) {
        setCustomRangeError("Start date must be before end date.");
        return;
      }
    }

    setFilters({
      ...draftFilters,
      customFrom:
        draftFilters.dateRange === "custom" ? draftFilters.customFrom : null,
      customTo:
        draftFilters.dateRange === "custom" ? draftFilters.customTo : null,
    });
    setFilterModalVisible(false);
    setCustomRangeError(null);
  };

  const handleResetFilters = () => {
    setDraftFilters({ ...DEFAULT_FILTERS });
    setCustomRangeError(null);
  };

  const openDatePicker = (target: "from" | "to") => {
    const referenceDate =
      target === "from"
        ? (draftFilters.customFrom ?? new Date())
        : (draftFilters.customTo ?? draftFilters.customFrom ?? new Date());

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "date",
        value: referenceDate,
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            const normalized = normalizeDate(selectedDate);
            setDraftFilters((prev) => {
              const next: SearchFilters = { ...prev };
              if (target === "from") {
                next.customFrom = normalized;
                if (next.customTo && normalized && normalized > next.customTo) {
                  next.customTo = normalized;
                }
              } else {
                next.customTo = normalized;
              }
              return next;
            });
            setCustomRangeError(null);
          }
        },
        minimumDate:
          target === "to" ? (draftFilters.customFrom ?? undefined) : undefined,
        maximumDate:
          target === "from" ? (draftFilters.customTo ?? undefined) : undefined,
      });
      return;
    }

    setIosDatePickerState({
      visible: true,
      target,
      baseDate: normalizeDate(referenceDate),
    });
  };

  const handleIosDateCancel = () => {
    setIosDatePickerState((prev) => ({ ...prev, visible: false }));
  };

  const handleIosDateConfirm = () => {
    setDraftFilters((prev) => {
      const next: SearchFilters = { ...prev };
      const normalized = normalizeDate(iosDatePickerState.baseDate);
      if (iosDatePickerState.target === "from") {
        next.customFrom = normalized;
        if (next.customTo && normalized > next.customTo) {
          next.customTo = normalized;
        }
      } else {
        next.customTo = normalized;
      }
      return next;
    });
    setIosDatePickerState((prev) => ({ ...prev, visible: false }));
    setCustomRangeError(null);
  };

  const handleIosDateChange = (_event: unknown, date?: Date) => {
    if (!date) {
      return;
    }
    setIosDatePickerState((prev) => ({
      ...prev,
      baseDate: normalizeDate(date),
    }));
  };

  const handleClearSearch = () => {
    setSearchInput("");
    Keyboard.dismiss();
  };

  const handleOpenItem = useCallback(
    (id: number) => {
      router.push({
        pathname: "/screens/home/ItemDetail",
        params: { id: String(id) },
      });
    },
    [router],
  );

  const renderItem = ({ item }: { item: LostItemSummary }) => (
    <View style={styles.listItem}>
      <LostItemCard
        item={item}
        palette={palette}
        scheme={scheme}
        onPress={() => handleOpenItem(item.id)}
      />
    </View>
  );

  const listEmptyComponent = () => {
    if (isInitialLoading) {
      return null;
    }

    if (errorMessage) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="warning-outline" size={48} color={palette.danger} />
          <Text style={styles.stateTitle}>Couldn&apos;t load items</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPage(0, "replace")}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <Ionicons
          name="search-outline"
          size={48}
          color={palette.textSecondary}
        />
        <Text style={styles.stateTitle}>No matching items</Text>
        <Text style={styles.stateSubtitle}>
          Adjust your search or filters to see more results.
        </Text>
        {filtersActive ? (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setFilters({ ...DEFAULT_FILTERS });
              setSearchInput("");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.clearFiltersButtonText}>Reset search</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Search Items</Text>
            {totalResultsLabel ? (
              <Text style={styles.resultsLabel}>{totalResultsLabel}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filtersActive ? styles.filterButtonActive : null,
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filtersActive ? palette.surface : palette.primary}
            />
            <Text
              style={[
                styles.filterButtonText,
                filtersActive ? { color: palette.surface } : null,
              ]}
            >
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={palette.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name, description, or location"
            placeholderTextColor={palette.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={handleClearSearch}
              hitSlop={12}
              activeOpacity={0.85}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {errorMessage && !isInitialLoading ? (
          <TouchableOpacity
            style={styles.inlineError}
            onPress={() => fetchPage(0, "replace")}
            activeOpacity={0.85}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={palette.danger}
            />
            <Text style={styles.inlineErrorText}>{errorMessage}</Text>
            <Ionicons name="refresh" size={18} color={palette.danger} />
          </TouchableOpacity>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingLabel}>Loading items…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            ListEmptyComponent={listEmptyComponent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.45}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text style={styles.footerLoadingText}>Loading more…</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>

      <FilterModal
        visible={isFilterModalVisible}
        styles={styles}
        palette={palette}
        scheme={scheme}
        filters={draftFilters}
        setFilters={setDraftFilters}
        onClose={() => {
          setFilterModalVisible(false);
          setCustomRangeError(null);
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        customRangeError={customRangeError}
        openDatePicker={openDatePicker}
      />

      {Platform.OS === "ios" ? (
        <IosDatePickerModal
          visible={iosDatePickerState.visible}
          scheme={scheme}
          date={iosDatePickerState.baseDate}
          target={iosDatePickerState.target}
          onCancel={handleIosDateCancel}
          onConfirm={handleIosDateConfirm}
          onChange={handleIosDateChange}
          styles={styles}
        />
      ) : null}
    </SafeAreaView>
  );
}

type FilterModalProps = {
  visible: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: Palette;
  scheme: "light" | "dark";
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  customRangeError: string | null;
  openDatePicker: (target: "from" | "to") => void;
};

function FilterModal({
  visible,
  styles,
  palette,
  scheme,
  filters,
  setFilters,
  onClose,
  onApply,
  onReset,
  customRangeError,
  openDatePicker,
}: FilterModalProps) {
  const toggleCategory = useCallback(
    (value: ItemCategory | null) => {
      setFilters((prev) => {
        if (value === null) {
          return { ...prev, categories: [] };
        }

        const exists = prev.categories.includes(value);
        const nextCategories = exists
          ? prev.categories.filter((category) => category !== value)
          : [...prev.categories, value];

        return {
          ...prev,
          categories: nextCategories,
        };
      });
    },
    [setFilters],
  );

  const handleStatusChange = useCallback(
    (value: ItemStatus | null) => {
      setFilters((prev) => ({
        ...prev,
        status: value,
      }));
    },
    [setFilters],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.modalHeaderIconBadge}>
                <Ionicons
                  name="funnel-outline"
                  size={18}
                  color={palette.primary}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Refine results</Text>
                <Text style={styles.modalSubtitle}>
                  Update filters & sorting
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Text style={styles.modalSectionTitle}>Categories</Text>
                <Text style={styles.modalSectionHint}>
                  Choose one or more to refine your search.
                </Text>
              </View>
              <View style={styles.chipGroup}>
                {CATEGORY_OPTIONS.map((option) => {
                  const isActive =
                    option.value === null
                      ? filters.categories.length === 0
                      : filters.categories.includes(option.value);
                  const iconColor = isActive
                    ? palette.surface
                    : palette.textSecondary;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.chip, isActive ? styles.chipActive : null]}
                      onPress={() => toggleCategory(option.value)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={iconColor}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          isActive ? styles.chipLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Text style={styles.modalSectionTitle}>Status</Text>
                <Text style={styles.modalSectionHint}>
                  Match the current state of the item.
                </Text>
              </View>
              <View style={styles.chipGroup}>
                {STATUS_OPTIONS.map((option) => {
                  const isActive = filters.status === option.value;
                  const iconColor = isActive
                    ? palette.surface
                    : palette.textSecondary;

                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.chip, isActive ? styles.chipActive : null]}
                      onPress={() => handleStatusChange(option.value)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={iconColor}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          isActive ? styles.chipLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Text style={styles.modalSectionTitle}>Date range</Text>
                <Text style={styles.modalSectionHint}>
                  Use quick presets or pick a custom span.
                </Text>
              </View>
              <View style={styles.chipGroup}>
                {DATE_RANGE_OPTIONS.map((option) => {
                  const isActive = filters.dateRange === option.value;
                  const iconColor = isActive
                    ? palette.surface
                    : palette.textSecondary;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, isActive ? styles.chipActive : null]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: option.value,
                          ...(option.value === "custom"
                            ? {}
                            : { customFrom: null, customTo: null }),
                        }))
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={iconColor}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          isActive ? styles.chipLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filters.dateRange === "custom" ? (
                <View style={styles.customRangeRow}>
                  <TouchableOpacity
                    style={styles.customRangeButton}
                    onPress={() => openDatePicker("from")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={palette.textSecondary}
                    />
                    <Text style={styles.customRangeLabel}>
                      {filters.customFrom
                        ? formatDateForDisplay(filters.customFrom)
                        : "Start date"}
                    </Text>
                  </TouchableOpacity>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={palette.textSecondary}
                  />
                  <TouchableOpacity
                    style={styles.customRangeButton}
                    onPress={() => openDatePicker("to")}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={palette.textSecondary}
                    />
                    <Text style={styles.customRangeLabel}>
                      {filters.customTo
                        ? formatDateForDisplay(filters.customTo)
                        : "End date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {customRangeError ? (
                <Text style={styles.modalErrorText}>{customRangeError}</Text>
              ) : null}
            </View>

            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Text style={styles.modalSectionTitle}>Sort by</Text>
                <Text style={styles.modalSectionHint}>
                  Control the order of matching items.
                </Text>
              </View>
              <View style={styles.chipGroup}>
                {SORT_OPTIONS.map((option) => {
                  const isActive =
                    filters.sortBy === option.sortBy &&
                    filters.sortOrder === option.sortOrder;
                  const iconColor = isActive
                    ? palette.surface
                    : palette.textSecondary;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[styles.chip, isActive ? styles.chipActive : null]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: option.sortBy,
                          sortOrder: option.sortOrder,
                        }))
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={iconColor}
                        style={styles.chipIcon}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          isActive ? styles.chipLabelActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={onReset}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSecondaryLabel}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={onApply}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryLabel}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type IosDatePickerModalProps = {
  visible: boolean;
  scheme: "light" | "dark";
  date: Date;
  target: "from" | "to";
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (event: unknown, date?: Date) => void;
  styles: ReturnType<typeof createStyles>;
};

function IosDatePickerModal({
  visible,
  scheme,
  date,
  target,
  onCancel,
  onConfirm,
  onChange,
  styles,
}: IosDatePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.pickerOverlay} onPress={onCancel}>
        <View style={styles.iosPickerCard}>
          <View style={styles.iosPickerToolbar}>
            <TouchableOpacity onPress={onCancel} hitSlop={12}>
              <Text style={styles.iosPickerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.iosPickerTitle}>
              {target === "from" ? "Start date" : "End date"}
            </Text>
            <TouchableOpacity onPress={onConfirm} hitSlop={12}>
              <Text style={styles.iosPickerButton}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={date}
            onChange={onChange}
            mode="date"
            display="spinner"
            textColor={scheme === "dark" ? "#fff" : undefined}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debouncedValue;
}

function normalizeDate(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDateForDisplay(value: Date) {
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateForApi(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateRangeQuery(filters: SearchFilters): string | undefined {
  switch (filters.dateRange) {
    case "today":
    case "this_week":
    case "this_month":
      return filters.dateRange;
    case "custom":
      if (filters.customFrom && filters.customTo) {
        return `${formatDateForApi(filters.customFrom)}:${formatDateForApi(
          filters.customTo,
        )}`;
      }
      return undefined;
    default:
      return undefined;
  }
}

function isItemCategoryValue(value: string): value is ItemCategory {
  return CATEGORY_VALUE_SET.has(value as ItemCategory);
}

function createStyles(palette: Palette, scheme: "light" | "dark") {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      marginTop: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: palette.text,
    },
    resultsLabel: {
      fontSize: 14,
      color: palette.textSecondary,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 16,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.9)" : "rgba(255,255,255,0.96)",
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "android" ? 6 : 10,
      gap: 10,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: palette.text,
      paddingVertical: Platform.OS === "android" ? 0 : 4,
    },
    clearSearchButton: {
      padding: 2,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: palette.primarySoft,
    },
    filterButtonActive: {
      backgroundColor: palette.primary,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.primary,
    },
    inlineError: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor:
        scheme === "dark" ? "rgba(214,99,99,0.2)" : "rgba(214,99,99,0.12)",
    },
    inlineErrorText: {
      flex: 1,
      fontSize: 13,
      color: palette.danger,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
    },
    loadingLabel: {
      fontSize: 15,
      color: palette.textSecondary,
    },
    listContent: {
      paddingVertical: 20,
      paddingBottom: 40,
    },
    listSeparator: {
      height: 16,
    },
    listItem: {
      borderRadius: 18,
      overflow: "hidden",
    },
    footerLoading: {
      marginTop: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    footerLoadingText: {
      fontSize: 13,
      color: palette.textSecondary,
    },
    stateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 16,
    },
    stateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
    },
    stateSubtitle: {
      fontSize: 14,
      color: palette.textSecondary,
      textAlign: "center",
      paddingHorizontal: 12,
    },
    retryButton: {
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: palette.primary,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.surface,
    },
    clearFiltersButton: {
      marginTop: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    clearFiltersButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(6,10,18,0.55)",
      justifyContent: "flex-end",
      padding: 18,
    },
    modalCard: {
      borderRadius: 22,
      backgroundColor:
        scheme === "dark" ? "rgba(20,27,38,0.95)" : "rgba(255,255,255,0.98)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(155,191,244,0.14)" : palette.border,
      overflow: "hidden",
      maxHeight: "85%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: scheme === "dark" ? 0.45 : 0.2,
      shadowRadius: 18,
      elevation: 16,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor:
        scheme === "dark" ? "rgba(155,191,244,0.16)" : palette.border,
      backgroundColor:
        scheme === "dark" ? "rgba(17,24,35,0.9)" : "rgba(244,248,255,0.75)",
    },
    modalHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    modalHeaderIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark" ? "rgba(74,144,226,0.22)" : palette.primarySoft,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    modalSubtitle: {
      fontSize: 13,
      fontWeight: "500",
      color: palette.textSecondary,
    },
    modalScroll: {
      flexGrow: 0,
    },
    modalScrollContent: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 24,
    },
    modalSection: {
      gap: 14,
    },
    modalSectionHeader: {
      gap: 4,
    },
    modalSectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: palette.text,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    modalSectionHint: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    chipGroup: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(155,191,244,0.18)" : "rgba(74,144,226,0.2)",
      backgroundColor:
        scheme === "dark" ? "rgba(22,30,43,0.92)" : "rgba(244,247,252,0.96)",
    },
    chipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
      shadowColor: palette.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: scheme === "dark" ? 0.5 : 0.28,
      shadowRadius: 14,
      elevation: 6,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.text,
    },
    chipLabelActive: {
      color: palette.surface,
    },
    chipIcon: {
      marginBottom: Platform.OS === "ios" ? 1 : 0,
    },
    customRangeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    customRangeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor:
        scheme === "dark" ? "rgba(23,32,45,0.9)" : "rgba(245,247,250,0.95)",
    },
    customRangeLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: palette.text,
    },
    modalErrorText: {
      fontSize: 12,
      color: palette.danger,
    },
    modalFooter: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    modalSecondaryButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    modalSecondaryLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    modalPrimaryButton: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    modalPrimaryLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.surface,
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.2)",
      justifyContent: "flex-end",
      padding: 16,
    },
    iosPickerCard: {
      borderRadius: 18,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: "hidden",
    },
    iosPickerToolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    iosPickerTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.textSecondary,
    },
    iosPickerButton: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.primary,
    },
  });
}
