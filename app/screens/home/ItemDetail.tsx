import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../src/api/httpClient";
import {
  claimLostItem,
  deleteLostItem,
  fetchLostItemById,
  unclaimLostItem,
  type ItemCategory,
  type LostItemDetail,
} from "../../../src/api/items";
import { useAuth } from "../../../src/auth/AuthProvider";
import { Palette, useAppTheme } from "../../../src/theme";

const FALLBACK_IMAGE = "https://placehold.co/600x400?text=Item\Image!";

export default function ItemDetail() {
  const router = useRouter();
  const { session } = useAuth();
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
  const { width: screenWidth } = useWindowDimensions();

  const [item, setItem] = useState<LostItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isPreviewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const heroScrollRef = useRef<ScrollView | null>(null);
  const previewScrollRef = useRef<ScrollView | null>(null);

  const carouselImages = useMemo(() => {
    return sanitizeImageUris(item?.images);
  }, [item?.images]);

  const loadItem = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!numericId) {
        setItem(null);
        setErrorMessage("Item not found.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await fetchLostItemById(numericId, {
          signal: controller.signal,
        });
        setItem(data);
        setErrorMessage(null);
        setActiveImageIndex(0);
        setDescriptionExpanded(false);
      } catch (error) {
        if (isRequestCancelled(error)) {
          return;
        }

        setItem(null);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Unable to load this item right now.",
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        if (mode === "initial") {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [numericId],
  );

  useEffect(() => {
    if (!numericId) {
      setIsLoading(false);
      setErrorMessage("Item not found.");
      return;
    }

    loadItem("initial");

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [loadItem, numericId]);

  useEffect(() => {
    if (!isPreviewVisible || !previewScrollRef.current) {
      return;
    }
    previewScrollRef.current.scrollTo({
      x: previewIndex * Math.max(screenWidth, 1),
      animated: false,
    });
  }, [isPreviewVisible, previewIndex, screenWidth]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing || !numericId) {
      return;
    }
    loadItem("refresh");
  }, [isRefreshing, loadItem, numericId]);

  const handleRetry = useCallback(() => {
    loadItem("initial");
  }, [loadItem]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/screens/home/Landing");
  }, [router]);

  const handleOpenMap = useCallback(() => {
    if (!item) {
      return;
    }
    const url = buildMapUrl(item);
    if (!url) {
      Alert.alert("Location unavailable", "This item has no map location yet.");
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open maps", "Please try again later.");
    });
  }, [item]);

  const handleShare = useCallback(async () => {
    if (!item) {
      return;
    }

    const shareMessage = [
      item.itemName,
      item.locationFound ? `Location: ${item.locationFound}` : undefined,
      item.description ? `Details: ${item.description}` : undefined,
      item.postedBy?.name ? `Reported by: ${item.postedBy.name}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await Share.share({
        message: shareMessage || item.itemName,
        title: "Lost & Found item",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "User did not share") {
        return;
      }
      Alert.alert("Unable to share", "Please try again.");
    }
  }, [item]);

  const handleOpenPreview = useCallback(
    (index: number) => {
      const boundedIndex = Math.max(
        0,
        Math.min(index, Math.max(carouselImages.length - 1, 0)),
      );
      setPreviewIndex(boundedIndex);
      setPreviewVisible(true);
    },
    [carouselImages.length],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewVisible(false);
    setActiveImageIndex(previewIndex);
    if (heroScrollRef.current) {
      heroScrollRef.current.scrollTo({
        x: previewIndex * Math.max(screenWidth, 1),
        animated: false,
      });
    }
  }, [previewIndex, screenWidth]);

  const handlePreviewMomentum = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / Math.max(screenWidth, 1),
      );
      if (!Number.isFinite(index)) {
        return;
      }
      setPreviewIndex(index);
      setActiveImageIndex(index);
    },
    [screenWidth],
  );

  const statusVariant = useMemo(() => {
    return resolveStatusVariant(item?.status, palette, scheme);
  }, [item?.status, palette, scheme]);

  const categoryLabel = useMemo(() => {
    return item ? formatCategoryLabel(item.category) : "";
  }, [item]);

  const foundDateLabel = useMemo(() => {
    return item ? formatFoundDate(item.dateFound) : "";
  }, [item]);

  const coordinateLabel = useMemo(() => {
    if (!item) {
      return null;
    }
    return formatCoordinates(item.latitude, item.longitude);
  }, [item]);

  const statusNormalized = useMemo(() => {
    return (item?.status ?? "").toUpperCase();
  }, [item?.status]);

  const isOwner = useMemo(() => {
    if (!item || !session?.userId) {
      return false;
    }
    const reporterId = item.postedBy?.id ?? item.postedByUserId ?? null;
    return reporterId === session.userId;
  }, [item, session?.userId]);

  const userClaim = useMemo(() => {
    if (!Array.isArray(item?.claims) || !session?.userId) {
      return null;
    }
    return (
      item.claims.find((claim) => claim.claimer?.id === session.userId) ?? null
    );
  }, [item?.claims, session?.userId]);

  const userClaimStatus = useMemo(() => {
    return (userClaim?.status ?? "").toString().toUpperCase();
  }, [userClaim?.status]);

  const hasClaimed = useMemo(() => {
    return Boolean(userClaim);
  }, [userClaim]);

  const isUserClaimPending = useMemo(() => {
    if (!userClaimStatus) {
      return false;
    }
    return (
      userClaimStatus.startsWith("PENDING") ||
      userClaimStatus === "UNDER_REVIEW" ||
      userClaimStatus === "IN_REVIEW"
    );
  }, [userClaimStatus]);

  const isUserClaimApproved = useMemo(() => {
    if (!userClaimStatus) {
      return false;
    }
    return (
      userClaimStatus === "APPROVED" ||
      userClaimStatus === "VERIFIED" ||
      userClaimStatus === "APPROVED_FOR_PICKUP"
    );
  }, [userClaimStatus]);

  const isAvailableForClaim = useMemo(() => {
    return statusNormalized === "AVAILABLE";
  }, [statusNormalized]);

  const isPendingVerification = useMemo(() => {
    return statusNormalized === "PENDING_VERIFICATION";
  }, [statusNormalized]);

  const isClaimedStatus = useMemo(() => {
    return statusNormalized === "CLAIMED";
  }, [statusNormalized]);

  const dropOffLocation = useMemo(() => {
    return item?.locationFound || "the designated drop-off point";
  }, [item?.locationFound]);

  const claimableStatus = useMemo(() => {
    return isAvailableForClaim || isPendingVerification;
  }, [isAvailableForClaim, isPendingVerification]);

  const canAttemptClaim = useMemo(() => {
    if (!session || !item) {
      return false;
    }
    return !isOwner && claimableStatus && !hasClaimed;
  }, [session, item, isOwner, claimableStatus, hasClaimed]);

  const canAttemptUnclaim = useMemo(() => {
    if (!session || !item) {
      return false;
    }
    if (!userClaim) {
      return false;
    }
    return !isOwner && isUserClaimPending;
  }, [session, item, isOwner, isUserClaimPending, userClaim]);

  const claimButtonLabel = useMemo(() => {
    if (isClaiming) {
      return "Submitting claim…";
    }
    if (isUserClaimApproved) {
      return "Claim approved";
    }
    if (isUserClaimPending) {
      return "Claim submitted";
    }
    if (isClaimedStatus) {
      return "Item already claimed";
    }
    if (isPendingVerification) {
      return "Submit a claim";
    }
    if (!isAvailableForClaim) {
      return "Not available";
    }
    return "Claim this item";
  }, [
    isClaiming,
    isAvailableForClaim,
    isPendingVerification,
    isClaimedStatus,
    isUserClaimApproved,
    isUserClaimPending,
  ]);

  const claimButtonIcon = useMemo<keyof typeof Ionicons.glyphMap | null>(() => {
    if (isClaiming) {
      return null;
    }
    if (isUserClaimApproved) {
      return "checkmark-circle";
    }
    if (isUserClaimPending) {
      return "time-outline";
    }
    if (isClaimedStatus) {
      return "lock-closed-outline";
    }
    if (isPendingVerification) {
      return "time-outline";
    }
    if (!isAvailableForClaim) {
      return "lock-closed-outline";
    }
    return "hand-right-outline";
  }, [
    isClaiming,
    isAvailableForClaim,
    isPendingVerification,
    isClaimedStatus,
    isUserClaimApproved,
    isUserClaimPending,
  ]);

  const handleEditItem = useCallback(() => {
    if (!item?.id) {
      return;
    }
    router.push({
      pathname: "/screens/home/UpdateItem",
      params: { id: String(item.id) },
    });
  }, [item?.id, router]);

  const handleClaimItem = useCallback(async () => {
    if (!item?.id || !session) {
      return;
    }
    setIsClaiming(true);
    try {
      const result = await claimLostItem(item.id);
      setItem(result.item);
      const locationForMessage = result.item?.locationFound || dropOffLocation;
      Alert.alert(
        "Claim submitted",
        `Your claim has been submitted. Please visit ${locationForMessage} and provide your proof of ownership to complete verification.`,
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to claim this item right now.";
      Alert.alert("Claim failed", message);
    } finally {
      setIsClaiming(false);
    }
  }, [item?.id, session, dropOffLocation]);

  const handleUnclaimItem = useCallback(async () => {
    if (!userClaim?.id || !session) {
      return;
    }

    setIsUnclaiming(true);
    try {
      const result = await unclaimLostItem(userClaim.id);
      if (result.item) {
        setItem(result.item);
      } else if (item?.id) {
        await loadItem("refresh");
      }
      const successMessage = result.message || "Your claim has been withdrawn.";
      Alert.alert("Claim withdrawn", successMessage);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to unclaim this item right now.";
      Alert.alert("Unclaim failed", message);
    } finally {
      setIsUnclaiming(false);
    }
  }, [session, userClaim?.id, item?.id, loadItem]);

  const performDeleteItem = useCallback(async () => {
    const itemId = item?.id;
    if (!itemId) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await deleteLostItem(itemId);
      router.replace("/screens/home/Landing");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to delete this item right now.";
      Alert.alert("Delete failed", message);
    } finally {
      setIsDeleting(false);
    }
  }, [item?.id, router]);

  const handleDeleteItem = useCallback(() => {
    if (!item?.id || isDeleting) {
      return;
    }

    Alert.alert("Delete this item?", "This action cannot be undone.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: performDeleteItem,
      },
    ]);
  }, [item?.id, isDeleting, performDeleteItem]);

  const renderLoader = () => (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.centerStateText}>Loading item…</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerState}>
      <Ionicons name="warning-outline" size={48} color={palette.danger} />
      <Text style={styles.centerStateTitle}>Couldn&apos;t load item</Text>
      <Text style={styles.centerStateText}>
        {errorMessage ?? "Please try again in a moment."}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={16} color={palette.surface} />
        <Text style={styles.retryButtonLabel}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHero = () => (
    <View style={[styles.heroContainer, { width: screenWidth }]}>
      <ScrollView
        ref={heroScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / Math.max(screenWidth, 1),
          );
          setActiveImageIndex(index);
        }}
      >
        {carouselImages.map((uri, index) => (
          <TouchableOpacity
            key={`${uri}-${index}`}
            activeOpacity={0.9}
            onPress={() => handleOpenPreview(index)}
            style={[styles.heroImageWrapper, { width: screenWidth }]}
          >
            <Image
              source={{ uri }}
              style={styles.heroImage}
              contentFit="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.heroTopBar}>
        <TouchableOpacity
          style={styles.heroIconButton}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={20} color={palette.surface} />
        </TouchableOpacity>
      </View>
      <View style={styles.heroDotsRow}>
        {carouselImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.heroDot,
              index === activeImageIndex ? styles.heroDotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderHeadline = () => {
    if (!item) {
      return null;
    }

    return (
      <View style={styles.headlineSection}>
        <View style={styles.headlineChipRow}>
          <View style={styles.headlineChip}>
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={palette.primary}
            />
            <Text style={styles.headlineChipText}>{categoryLabel}</Text>
          </View>
          <View
            style={[
              styles.headlineStatusChip,
              { backgroundColor: statusVariant.background },
            ]}
          >
            <Ionicons
              name={statusVariant.icon}
              size={14}
              color={statusVariant.textColor}
            />
            <Text
              style={[
                styles.headlineStatusChipText,
                { color: statusVariant.textColor },
              ]}
            >
              {statusVariant.label}
            </Text>
          </View>
        </View>
        <Text style={styles.headlineTitle}>{item.itemName}</Text>
        <Text style={styles.headlineSubtitle} numberOfLines={2}>
          {item.locationFound ?? "Location not specified"}
        </Text>
      </View>
    );
  };

  const renderContent = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={palette.primary}
          colors={[palette.primary]}
        />
      }
    >
      {renderHero()}

      <View style={styles.bodyContainer}>
        {renderHeadline()}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Item snapshot</Text>
          <View style={styles.infoGrid}>
            <InfoCell
              icon="calendar-outline"
              label="Reported on"
              value={foundDateLabel || "Not provided"}
            />
            <InfoCell
              icon="locate-outline"
              label="Coordinates"
              value={coordinateLabel ?? "Unavailable"}
              onPress={coordinateLabel ? handleOpenMap : undefined}
              accentColor={coordinateLabel ? palette.primary : undefined}
            />
          </View>
        </View>

        {item?.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Description</Text>
            <Text
              style={styles.bodyText}
              numberOfLines={isDescriptionExpanded ? undefined : 4}
            >
              {item.description}
            </Text>
            {item.description.length > 200 ? (
              <TouchableOpacity
                onPress={() => setDescriptionExpanded((prev) => !prev)}
                style={styles.toggleDescriptionButton}
                activeOpacity={0.85}
              >
                <Text style={styles.toggleDescriptionText}>
                  {isDescriptionExpanded ? "See less" : "See more"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>People involved</Text>
          <PersonRow
            title="Reported by"
            person={item?.postedBy}
            fallbackLabel="Awaiting reporter details"
            icon="person-circle-outline"
          />
          <View style={styles.personDivider} />
          <PersonRow
            title="Claimed by"
            person={item?.approvedClaimer}
            fallbackLabel="No approved claimer yet"
            icon="ribbon-outline"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Quick actions</Text>
          {isClaimedStatus ? (
            <View style={[styles.statusNotice, styles.claimedNotice]}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={scheme === "dark" ? palette.surface : palette.primary}
                style={styles.statusNoticeIcon}
              />
              <View style={styles.statusNoticeContent}>
                <Text
                  style={[
                    styles.statusNoticeTitle,
                    scheme === "dark" ? styles.statusNoticeTitleOnDark : null,
                  ]}
                >
                  This item has been claimed
                </Text>
                <Text
                  style={[
                    styles.statusNoticeBody,
                    scheme === "dark" ? styles.statusNoticeBodyOnDark : null,
                  ]}
                >
                  A staff member has verified ownership and removed the item
                  from circulation.
                </Text>
              </View>
            </View>
          ) : null}

          {!isClaimedStatus && isUserClaimPending ? (
            <View style={[styles.statusNotice, styles.pendingNotice]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={palette.primary}
                style={styles.statusNoticeIcon}
              />
              <View style={styles.statusNoticeContent}>
                <Text style={styles.statusNoticeTitle}>Claim submitted</Text>
                <Text style={styles.statusNoticeBody}>
                  Please visit {dropOffLocation} and provide your proof of
                  ownership to complete verification.
                </Text>
              </View>
            </View>
          ) : null}

          {!isClaimedStatus && isUserClaimApproved ? (
            <View style={[styles.statusNotice, styles.claimedNotice]}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={scheme === "dark" ? palette.surface : palette.primary}
                style={styles.statusNoticeIcon}
              />
              <View style={styles.statusNoticeContent}>
                <Text
                  style={[
                    styles.statusNoticeTitle,
                    scheme === "dark" ? styles.statusNoticeTitleOnDark : null,
                  ]}
                >
                  Claim approved
                </Text>
                <Text
                  style={[
                    styles.statusNoticeBody,
                    scheme === "dark" ? styles.statusNoticeBodyOnDark : null,
                  ]}
                >
                  Campus staff have approved your claim. Please collect the item
                  from {dropOffLocation}.
                </Text>
              </View>
            </View>
          ) : null}

          {!isClaimedStatus && !hasClaimed && isPendingVerification ? (
            <View
              style={[
                styles.statusNotice,
                styles.infoNotice,
                scheme === "dark"
                  ? styles.infoNoticeDark
                  : styles.infoNoticeLight,
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  scheme === "dark" ? palette.primarySoft : palette.primary
                }
                style={styles.statusNoticeIcon}
              />
              <View style={styles.statusNoticeContent}>
                <Text
                  style={[
                    styles.statusNoticeTitle,
                    scheme === "dark"
                      ? styles.statusNoticeTitleOnDark
                      : styles.statusNoticeTitleOnLight,
                  ]}
                >
                  Verification in progress
                </Text>
                <Text
                  style={[
                    styles.statusNoticeBody,
                    scheme === "dark"
                      ? styles.statusNoticeBodyOnDark
                      : styles.statusNoticeBodyOnLight,
                  ]}
                >
                  A campus staff member is reviewing submitted claims. You can
                  still submit your own claim below.
                </Text>
              </View>
            </View>
          ) : null}

          {!isOwner && session && !isClaimedStatus ? (
            <TouchableOpacity
              style={[
                styles.claimButton,
                (!canAttemptClaim || isClaiming || hasClaimed) &&
                  styles.claimButtonDisabled,
              ]}
              onPress={() => {
                if (canAttemptClaim && !isClaiming) {
                  void handleClaimItem();
                }
              }}
              activeOpacity={0.85}
              disabled={!canAttemptClaim || isClaiming}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={palette.surface} />
              ) : claimButtonIcon ? (
                <Ionicons
                  name={claimButtonIcon}
                  size={18}
                  color={
                    !canAttemptClaim || hasClaimed || isClaiming
                      ? palette.textSecondary
                      : palette.surface
                  }
                />
              ) : null}
              <Text
                style={[
                  styles.claimButtonText,
                  (!canAttemptClaim || hasClaimed || isClaiming) &&
                    styles.claimButtonTextDisabled,
                ]}
              >
                {claimButtonLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
          {!isOwner &&
          session &&
          hasClaimed &&
          (canAttemptUnclaim || isUnclaiming) ? (
            <TouchableOpacity
              style={[
                styles.unclaimButton,
                (!canAttemptUnclaim || isUnclaiming) &&
                  styles.unclaimButtonDisabled,
              ]}
              onPress={() => {
                if (canAttemptUnclaim && !isUnclaiming) {
                  void handleUnclaimItem();
                }
              }}
              activeOpacity={0.85}
              disabled={!canAttemptUnclaim || isUnclaiming}
            >
              {isUnclaiming ? (
                <ActivityIndicator size="small" color={palette.text} />
              ) : (
                <Ionicons
                  name="arrow-undo-outline"
                  size={18}
                  color={palette.text}
                />
              )}
              <Text style={styles.unclaimButtonText}>
                {isUnclaiming ? "Releasing…" : "Withdraw claim"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.primaryAction,
                { backgroundColor: palette.primary },
              ]}
              onPress={handleOpenMap}
              activeOpacity={0.85}
            >
              <Ionicons
                name="navigate-outline"
                size={18}
                color={palette.surface}
              />
              <Text
                style={[styles.primaryActionText, { color: palette.surface }]}
              >
                Open in Maps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: palette.border }]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color={palette.text} />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>

          {isOwner ? (
            <View style={styles.ownerActionsRow}>
              <TouchableOpacity
                style={[
                  styles.ownerActionButton,
                  { borderColor: palette.border },
                ]}
                onPress={handleEditItem}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={palette.text}
                />
                <Text style={styles.ownerActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ownerActionButton,
                  styles.ownerDeleteButton,
                  isDeleting ? styles.ownerActionDisabled : null,
                ]}
                onPress={handleDeleteItem}
                activeOpacity={0.85}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator size="small" color={palette.surface} />
                    <Text
                      style={[
                        styles.ownerActionText,
                        { color: palette.surface },
                      ]}
                    >
                      Deleting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={palette.surface}
                    />
                    <Text
                      style={[
                        styles.ownerActionText,
                        { color: palette.surface },
                      ]}
                    >
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );

  const renderPreviewModal = () => {
    if (!isPreviewVisible) {
      return null;
    }

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <View style={styles.previewBackdrop}>
          <StatusBar
            barStyle="light-content"
            backgroundColor="rgba(0,0,0,0.96)"
          />
          <SafeAreaView
            style={styles.previewSafeArea}
            edges={["top", "bottom"]}
          >
            <View style={styles.previewHeader}>
              <TouchableOpacity
                style={styles.previewCloseButton}
                onPress={handleClosePreview}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={previewScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.previewCarousel}
              contentContainerStyle={styles.previewCarouselContent}
              onMomentumScrollEnd={handlePreviewMomentum}
            >
              {carouselImages.map((uri, index) => (
                <View
                  key={`${uri}-preview-${index}`}
                  style={[styles.previewPage, { width: screenWidth }]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.previewImage}
                    contentFit="contain"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.previewFooter}>
              <Text style={styles.previewCounter}>
                {`${previewIndex + 1} / ${carouselImages.length}`}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={palette.background}
      />

      {isLoading ? renderLoader() : null}
      {!isLoading && errorMessage ? renderError() : null}
      {!isLoading && !errorMessage ? renderContent() : null}
      {renderPreviewModal()}
    </SafeAreaView>
  );
}

type PersonRowProps = {
  title: string;
  person: LostItemDetail["postedBy"] | LostItemDetail["approvedClaimer"];
  fallbackLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function PersonRow({ title, person, fallbackLabel, icon }: PersonRowProps) {
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => personRowStyles(palette, scheme),
    [palette, scheme],
  );

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        {person?.profilePhoto ? (
          <Image
            source={{ uri: person.profilePhoto }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name={icon} size={20} color={palette.surface} />
          </View>
        )}
      </View>
      <View style={styles.personTextColumn}>
        <Text style={styles.personTitle}>{title}</Text>
        <Text style={styles.personValue} numberOfLines={1}>
          {person?.name ?? fallbackLabel}
        </Text>
      </View>
    </View>
  );
}

type InfoCellProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  accentColor?: string;
};

function InfoCell({ icon, label, value, onPress, accentColor }: InfoCellProps) {
  const { palette, scheme } = useAppTheme();
  const styles = useMemo(
    () => infoCellStyles(palette, scheme),
    [palette, scheme],
  );

  const content = (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons
          name={icon}
          size={16}
          color={accentColor ?? palette.primary}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, accentColor ? { color: accentColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {content}
    </TouchableOpacity>
  );
}

function formatCategoryLabel(category: ItemCategory): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatFoundDate(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function sanitizeImageUris(images?: string[] | null): string[] {
  if (!images || images.length === 0) {
    return [FALLBACK_IMAGE];
  }
  const valid = images.filter((uri) => isProbablyImageUri(uri));
  return valid.length > 0 ? valid : [FALLBACK_IMAGE];
}

function isProbablyImageUri(uri: string | null | undefined): boolean {
  if (!uri) {
    return false;
  }
  const lower = uri.toLowerCase();
  if (!lower.startsWith("http")) {
    return false;
  }
  const extensions = [".jpg", ".jpeg", ".png", ".webp", ".heic"];
  return extensions.some((extension) => lower.includes(extension));
}

function buildMapUrl(item: LostItemDetail): string | null {
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  }
  if (item.locationFound) {
    return `https://www.google.com/maps/search/?api=1&query=VBPSU, ${encodeURIComponent(item.locationFound)}, Veer Bahadur Singh Purvanchal University, Jaunpur, Uttar Pradesh, India`;
  }
  return null;
}

function resolveStatusVariant(
  status: string | undefined | null,
  palette: Palette,
  scheme: "light" | "dark",
) {
  const normalized = status?.toLowerCase() ?? "unknown";
  if (normalized === "claimed") {
    return {
      label: "Claimed",
      background:
        scheme === "dark" ? "rgba(245,166,35,0.28)" : "rgba(245,166,35,0.18)",
      textColor: scheme === "dark" ? "#ffd48b" : "#b8740a",
      icon: "ribbon-outline" as const,
    };
  }
  if (normalized === "pending_verification") {
    return {
      label: "Pending verification",
      background:
        scheme === "dark" ? "rgba(59,130,246,0.26)" : "rgba(59,130,246,0.16)",
      textColor: scheme === "dark" ? "#9ec5ff" : "#1d4ed8",
      icon: "time-outline" as const,
    };
  }
  if (normalized === "available") {
    return {
      label: "Available",
      background:
        scheme === "dark" ? "rgba(142,207,128,0.22)" : "rgba(72,187,65,0.18)",
      textColor: scheme === "dark" ? "#9de38b" : "#2f6b22",
      icon: "sparkles-outline" as const,
    };
  }
  return {
    label: status ? formatFallbackStatusLabel(status) : "Unknown",
    background:
      scheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
    textColor: palette.text,
    icon: "ellipse-outline" as const,
  };
}

function formatFallbackStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function isRequestCancelled(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (
    error instanceof ApiError &&
    error.cause instanceof Error &&
    (error.cause.name === "CanceledError" || error.cause.name === "AbortError")
  ) {
    return true;
  }
  return (
    error instanceof Error &&
    (error.name === "CanceledError" || error.name === "AbortError")
  );
}

const createStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    heroContainer: {
      position: "relative",
      height: 300,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: scheme === "dark" ? 0.4 : 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    heroImageWrapper: {
      height: "100%",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroTopBar: {
      position: "absolute",
      top: 16,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    heroIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    headlineSection: {
      gap: 12,
    },
    headlineChipRow: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    headlineChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        scheme === "dark" ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
    },
    headlineChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    headlineStatusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headlineStatusChipText: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    headlineTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: palette.text,
    },
    headlineSubtitle: {
      fontSize: 14,
      fontWeight: "500",
      color: palette.textSecondary,
    },
    heroDotsRow: {
      position: "absolute",
      bottom: 12,
      alignSelf: "center",
      flexDirection: "row",
      gap: 6,
    },
    heroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.4)",
    },
    heroDotActive: {
      backgroundColor: palette.surface,
      transform: [{ scale: 1.25 }],
    },
    bodyContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 20,
    },
    card: {
      backgroundColor: palette.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: scheme === "dark" ? 0.3 : 0.12,
      shadowRadius: 12,
      elevation: 3,
      gap: 18,
    },
    statusNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: palette.border,
    },
    pendingNotice: {
      backgroundColor:
        scheme === "dark" ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
      borderColor:
        scheme === "dark" ? "rgba(99,155,255,0.45)" : "rgba(59,130,246,0.28)",
    },
    claimedNotice: {
      backgroundColor:
        scheme === "dark" ? "rgba(34,197,94,0.26)" : "rgba(34,197,94,0.18)",
      borderColor:
        scheme === "dark" ? "rgba(134,239,172,0.55)" : "rgba(34,197,94,0.45)",
    },
    statusNoticeIcon: {
      marginTop: 2,
    },
    statusNoticeContent: {
      flex: 1,
      gap: 4,
    },
    statusNoticeTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: palette.text,
    },
    statusNoticeBody: {
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18,
    },
    statusNoticeTitleOnDark: {
      color: palette.text,
    },
    statusNoticeBodyOnDark: {
      color: "rgba(255,255,255,0.78)",
    },
    statusNoticeTitleOnLight: {
      color: palette.text,
    },
    statusNoticeBodyOnLight: {
      color: palette.textSecondary,
    },
    infoNotice: {
      borderWidth: 1,
    },
    infoNoticeDark: {
      backgroundColor: "rgba(59,130,246,0.14)",
      borderColor: "rgba(145,194,255,0.32)",
    },
    infoNoticeLight: {
      backgroundColor: "rgba(59,130,246,0.1)",
      borderColor: "rgba(59,130,246,0.22)",
    },
    sectionHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    bodyText: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.text,
    },
    toggleDescriptionButton: {
      alignSelf: "flex-start",
      marginTop: 6,
    },
    toggleDescriptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.primary,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap",
    },
    primaryAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flex: 1,
    },
    primaryActionText: {
      fontSize: 15,
      fontWeight: "600",
    },
    secondaryAction: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flex: 1,
      borderWidth: 1,
      backgroundColor: palette.surface,
    },
    secondaryActionText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    claimButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: palette.primary,
      marginBottom: 12,
    },
    claimButtonDisabled: {
      backgroundColor:
        scheme === "dark" ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.16)",
      borderWidth: 1,
      borderColor:
        scheme === "dark" ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.24)",
    },
    claimButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.surface,
    },
    claimButtonTextDisabled: {
      color: palette.text,
    },
    unclaimButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor:
        scheme === "dark" ? "rgba(148,163,184,0.18)" : "rgba(148,163,184,0.12)",
      marginBottom: 12,
    },
    unclaimButtonDisabled: {
      opacity: 0.75,
    },
    unclaimButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    ownerActionsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
    },
    ownerActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderWidth: 1,
      backgroundColor: palette.surface,
    },
    ownerActionDisabled: {
      opacity: 0.75,
    },
    ownerActionText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
    ownerDeleteButton: {
      backgroundColor: palette.danger,
      borderColor: palette.danger,
    },
    personDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 16,
    },
    centerStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
      textAlign: "center",
    },
    centerStateText: {
      fontSize: 14,
      color: palette.textSecondary,
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
    previewBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.96)",
    },
    previewSafeArea: {
      flex: 1,
    },
    previewHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    previewCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    previewCarousel: {
      flex: 1,
    },
    previewCarouselContent: {
      flexGrow: 1,
    },
    previewPage: {
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    previewFooter: {
      alignItems: "center",
      paddingVertical: 16,
    },
    previewCounter: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
  });

const personRowStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatarWrapper: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor:
        scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    avatarFallback: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    personTextColumn: {
      flex: 1,
      gap: 4,
    },
    personTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    personValue: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
    },
  });

const infoCellStyles = (palette: Palette, scheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flexBasis: "48%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
      backgroundColor:
        scheme === "dark" ? "rgba(17,24,39,0.85)" : "rgba(248,250,252,0.96)",
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        scheme === "dark"
          ? "rgba(99, 102, 241, 0.18)"
          : "rgba(59,130,246,0.16)",
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    value: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
  });
