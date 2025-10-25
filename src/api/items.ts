import { Platform } from "react-native";
import { ApiError, httpClient, type HttpRequestConfig } from "./httpClient";

export type ItemCategory =
    | "PHONE"
    | "WALLET"
    | "KEYS"
    | "BAG"
    | "ELECTRONIC"
    | "CLOTHING"
    | "STATIONERY"
    | "DOCUMENT"
    | "OTHER";

export type ItemStatus =
    | "AVAILABLE"
    | "CLAIMED"
    | "RESOLVED"
    | "ARCHIVED"
    | string;

export interface LostItemSummary {
    id: number;
    itemName: string;
    description: string | null;
    locationFound: string | null;
    latitude: number | null;
    longitude: number | null;
    images: string[];
    dateFound: string | null;
    status: ItemStatus;
    category: ItemCategory;
    postedByUserId?: number;
    claimedByUserId?: number | null;
}

export interface ItemPersonReference {
    id: number;
    name: string;
    profilePhoto?: string | null;
}

export type ItemClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | string;

export interface ItemClaimRecord {
    id: number;
    itemId: number;
    status: ItemClaimStatus;
    createdAt?: string | null;
    claimer?: ItemPersonReference | null;
}

export interface PagedLostItems {
    items: LostItemSummary[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
}

export interface ReportLostItemPayload {
    itemName: string;
    category: ItemCategory;
    description?: string;
    locationFound: string;
    dateFound?: string;
    latitude?: number;
    longitude?: number;
    imageUris?: string[];
}

export interface ReportLostItemResponseData {
    reportId: number;
    itemName: string;
    category: ItemCategory;
    [key: string]: unknown;
}

export interface ReportLostItemResponse {
    success: boolean;
    message: string;
    data?: ReportLostItemResponseData | Record<string, unknown>;
    error?: string;
}

export interface UpdateLostItemPayload {
    itemName?: string | null;
    description?: string | null;
    locationFound?: string | null;
    dateFound?: string | null;
    category?: ItemCategory | null;
    latitude?: number | null;
    longitude?: number | null;
}

export interface UpdateLostItemResponse {
    success: boolean;
    message?: string;
    data?: LostItemDetail;
    error?: string;
}

export interface DeleteLostItemResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface FetchLostItemsParams {
    searchTerm?: string;
    category?: ItemCategory | ItemCategory[];
    dateRange?: string;
    status?: ItemStatus;
    sortBy?: string;
    sortOrder?: "asc" | "desc" | string;
    page?: number;
    size?: number;
}

type LostItemsApiResponse = {
    success: boolean;
    message?: string;
    data?: PagedLostItems;
    error?: string;
};

type MyReportedItemsApiResponse = {
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
};

function coerceNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function coerceString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeItemCategory(category: unknown): ItemCategory {
    if (typeof category !== "string") {
        return "OTHER";
    }

    const normalized = category.trim().toUpperCase();

    switch (normalized) {
        case "PHONE":
            return "PHONE";
        case "WALLET":
            return "WALLET";
        case "KEYS":
        case "KEY":
            return "KEYS";
        case "BAG":
        case "BACKPACK":
            return "BAG";
        case "ELECTRONIC":
        case "ELECTRONICS":
        case "LAPTOP":
        case "GADGET":
            return "ELECTRONIC";
        case "CLOTHING":
        case "APPAREL":
            return "CLOTHING";
        case "STATIONERY":
        case "STATIONARY":
        case "SUPPLIES":
            return "STATIONERY";
        case "DOCUMENT":
        case "DOCUMENTS":
        case "ID":
        case "IDENTITY":
            return "DOCUMENT";
        case "OTHER":
            return "OTHER";
        default:
            return "OTHER";
    }
}

function normalizeImages(value: unknown): string[] {
    const candidates: unknown[] = [];

    if (Array.isArray(value)) {
        candidates.push(...value);
    } else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const nestedImages = record.images ?? record.imageUrls ?? record.photos;
        if (Array.isArray(nestedImages)) {
            candidates.push(...nestedImages);
        }
    }

    const resolved = candidates
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((uri) => uri.trim());

    return resolved.length > 0 ? resolved : [];
}

function normalizeLostItemSummary(raw: unknown): LostItemSummary | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }

    const record = raw as Record<string, unknown>;

    const id = coerceNumber(record.id ?? record.itemId ?? record.reportId);
    const itemName = coerceString(record.itemName ?? record.title ?? record.name);

    if (id === null || !itemName) {
        return null;
    }

    const description = coerceString(record.description ?? record.details);
    const locationFound = coerceString(record.locationFound ?? record.location);
    const latitude = coerceNumber(record.latitude);
    const longitude = coerceNumber(record.longitude);
    const dateFound = coerceString(record.dateFound ?? record.dateLost ?? record.createdAt);

    const rawStatus = coerceString(record.status ?? record.state) ?? "UNKNOWN";
    const category = normalizeItemCategory(record.category ?? record.itemCategory);

    const postedBySource = record.postedBy ?? record.reportedBy ?? record.user;
    const claimedBySource =
        record.approvedClaimer ?? record.claimedBy ?? record.claimer ?? record.latestApprovedClaimer;

    const postedByUserId = coerceNumber(
        (postedBySource && typeof postedBySource === "object"
            ? (postedBySource as Record<string, unknown>).id
            : undefined) ?? record.postedByUserId,
    );

    const claimedByUserId = coerceNumber(
        (claimedBySource && typeof claimedBySource === "object"
            ? (claimedBySource as Record<string, unknown>).id
            : undefined) ?? record.claimedByUserId,
    );

    const images = normalizeImages(record.images ?? record.imageUrls ?? record.photos);

    return {
        id,
        itemName,
        description,
        locationFound,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        images,
        dateFound,
        status: rawStatus,
        category,
        postedByUserId: postedByUserId ?? undefined,
        claimedByUserId: claimedByUserId ?? undefined,
    };
}

function extractFileName(uri: string, fallback: string, index: number) {
    const segments = uri.split(/[/\\]/);
    const last = segments.pop() ?? `${fallback}-${index + 1}`;
    if (last.includes(".")) {
        return last;
    }
    if (Platform.OS === "ios") {
        return `${last}.heic`;
    }
    return `${last}.jpg`;
}

function resolveMimeType(uri: string): string {
    const extension = uri.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "heic":
            return "image/heic";
        default:
            return "image/jpeg";
    }
}

export async function reportLostItem(
    payload: ReportLostItemPayload,
): Promise<ReportLostItemResponse> {
    console.log("[itemsApi] reportLostItem start", {
        itemName: payload.itemName,
        category: payload.category,
        hasImages: Boolean(payload.imageUris?.length),
    });
    const formData = new FormData();

    formData.append("itemName", payload.itemName.trim());
    formData.append("category", payload.category);

    if (payload.description) {
        formData.append("description", payload.description.trim());
    }
    formData.append("locationFound", payload.locationFound.trim());
    if (payload.dateFound) {
        formData.append("dateFound", payload.dateFound);
    }
    if (
        typeof payload.latitude === "number" &&
        typeof payload.longitude === "number"
    ) {
        formData.append("latitude", String(payload.latitude));
        formData.append("longitude", String(payload.longitude));
    }

    payload.imageUris?.slice(0, 5).forEach((uri, index) => {
        const name = extractFileName(uri, "item-image", index);
        const type = resolveMimeType(uri);
        const file = {
            uri,
            name,
            type,
        } as unknown as Blob;
        console.log("[itemsApi] reportLostItem attach image", {
            index,
            name,
            type,
        });
        formData.append("images", file);
    });

    const config: HttpRequestConfig = {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    };

    try {
        const response = await httpClient.post<ReportLostItemResponse>(
            "/api/items/report",
            formData,
            config,
        );

        console.log("[itemsApi] reportLostItem response", {
            success: response.data?.success,
            message: response.data?.message,
        });

        return response.data;
    } catch (error) {
        console.log("[itemsApi] reportLostItem error", {
            itemName: payload.itemName,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export async function fetchLostItems(
    params: FetchLostItemsParams = {},
    config?: HttpRequestConfig,
): Promise<PagedLostItems> {
    console.log("[itemsApi] fetchLostItems start", {
        params,
    });
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
        params: {
            ...(config?.params as Record<string, unknown> | undefined),
            ...params,
        },
    };

    try {
        const response = await httpClient.get<LostItemsApiResponse>("/api/items", requestConfig);
        const payload = response.data;

        if (!payload.success || !payload.data) {
            console.log("[itemsApi] fetchLostItems failed", {
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(payload.message || payload.error || "Unable to fetch items.", {
                status: response.status,
                data: payload,
            });
        }

        console.log("[itemsApi] fetchLostItems success", {
            total: payload.data.totalElements,
            page: payload.data.page,
        });

        return payload.data;
    } catch (error) {
        console.log("[itemsApi] fetchLostItems error", {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export async function fetchMyReportedItems(
    config?: HttpRequestConfig,
): Promise<LostItemSummary[]> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] fetchMyReportedItems start");

    try {
        const response = await httpClient.get<MyReportedItemsApiResponse>(
            "/api/items/my-reported-items",
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !Array.isArray(payload.data)) {
            console.log("[itemsApi] fetchMyReportedItems failed", {
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(
                payload.message || payload.error || "Unable to load reported items.",
                {
                    status: response.status,
                    data: payload,
                },
            );
        }

        const normalized = payload.data
            .map((entry) => normalizeLostItemSummary(entry))
            .filter((entry): entry is LostItemSummary => Boolean(entry));

        console.log("[itemsApi] fetchMyReportedItems success", {
            count: normalized.length,
        });

        return normalized;
    } catch (error) {
        console.log("[itemsApi] fetchMyReportedItems error", {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

type RecentlyReportedApiResponse = {
    success: boolean;
    message?: string;
    data?: LostItemSummary[];
    error?: string;
};

export async function fetchRecentlyReported(
    config?: HttpRequestConfig,
): Promise<LostItemSummary[]> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] fetchRecentlyReported start");

    try {
        const response = await httpClient.get<RecentlyReportedApiResponse>(
            "/api/items/recently-reported",
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            console.log("[itemsApi] fetchRecentlyReported failed", {
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(
                payload.message || payload.error || "Unable to fetch recently reported items.",
                {
                    status: response.status,
                    data: payload,
                },
            );
        }

        console.log("[itemsApi] fetchRecentlyReported success", {
            count: payload.data.length,
        });

        return payload.data;
    } catch (error) {
        console.log("[itemsApi] fetchRecentlyReported error", {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export interface LostItemDetail extends LostItemSummary {
    createdAt?: string | null;
    updatedAt?: string | null;
    reportedByName?: string | null;
    reportedByEmail?: string | null;
    reportedByPhone?: string | null;
    postedBy?: ItemPersonReference;
    approvedClaimer?: ItemPersonReference | null;
    claims?: ItemClaimRecord[];
}

type ItemDetailApiResponse = {
    success: boolean;
    message?: string;
    data?: LostItemDetail;
    error?: string;
};

type ClaimLostItemApiResponse = {
    success: boolean;
    message?: string;
    data?: LostItemDetail;
    error?: string;
};

export async function fetchLostItemById(
    id: number,
    config?: HttpRequestConfig,
): Promise<LostItemDetail> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] fetchLostItemById start", { id });

    try {
        const response = await httpClient.get<ItemDetailApiResponse>(
            `/api/items/${id}`,
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            console.log("[itemsApi] fetchLostItemById failed", {
                id,
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(payload.message || payload.error || "Unable to fetch item details.", {
                status: response.status,
                data: payload,
            });
        }

        console.log("[itemsApi] fetchLostItemById success", {
            id,
            status: payload.data.status,
            category: payload.data.category,
            item: payload.data.postedBy?.profilePhoto,
        });

        return payload.data;
    } catch (error) {
        console.log("[itemsApi] fetchLostItemById error", {
            id,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export type ItemClaimMutationResult = {
    message: string;
    item: LostItemDetail;
};

export async function claimLostItem(
    id: number,
    config?: HttpRequestConfig,
): Promise<ItemClaimMutationResult> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] claimLostItem start", { id });

    try {
        const response = await httpClient.post<ClaimLostItemApiResponse>(
            `/api/items/${id}/claim`,
            undefined,
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            console.log("[itemsApi] claimLostItem failed", {
                id,
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(
                payload.message || payload.error || "Unable to claim item.",
                {
                    status: response.status,
                    data: payload,
                },
            );
        }

        console.log("[itemsApi] claimLostItem success", {
            id,
            message: payload.message,
        });

        return {
            message: payload.message || "Item claimed successfully.",
            item: payload.data,
        };
    } catch (error) {
        console.log("[itemsApi] claimLostItem error", {
            id,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export async function unclaimLostItem(
    claimId: number,
    config?: HttpRequestConfig,
): Promise<ItemClaimMutationResult> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] unclaimLostItem start", { claimId });

    try {
        const response = await httpClient.delete<ClaimLostItemApiResponse>(
            `/api/items/unclaim/${claimId}`,
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !payload.data) {
            console.log("[itemsApi] unclaimLostItem failed", {
                claimId,
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(
                payload.message || payload.error || "Unable to unclaim item.",
                {
                    status: response.status,
                    data: payload,
                },
            );
        }

        console.log("[itemsApi] unclaimLostItem success", {
            claimId,
            message: payload.message,
        });

        return {
            message: payload.message || "Item is now available.",
            item: payload.data,
        };
    } catch (error) {
        console.log("[itemsApi] unclaimLostItem error", {
            claimId,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export async function updateLostItem(
    id: number,
    payload: UpdateLostItemPayload,
    config?: HttpRequestConfig,
): Promise<UpdateLostItemResponse> {
    const requestBody: Record<string, unknown> = {};

    if (payload.itemName !== undefined) {
        requestBody.itemName = payload.itemName?.trim() || null;
    }
    if (payload.description !== undefined) {
        const trimmed = payload.description?.trim();
        requestBody.description = trimmed?.length ? trimmed : null;
    }
    if (payload.locationFound !== undefined) {
        requestBody.locationFound = payload.locationFound?.trim() || null;
    }
    if (payload.dateFound !== undefined) {
        requestBody.dateFound = payload.dateFound || null;
    }
    if (payload.category !== undefined) {
        requestBody.category = payload.category ?? null;
    }
    if (payload.latitude !== undefined) {
        requestBody.latitude =
            typeof payload.latitude === "number" && Number.isFinite(payload.latitude)
                ? Number(payload.latitude.toFixed(6))
                : null;
    }
    if (payload.longitude !== undefined) {
        requestBody.longitude =
            typeof payload.longitude === "number" && Number.isFinite(payload.longitude)
                ? Number(payload.longitude.toFixed(6))
                : null;
    }

    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    try {
        const response = await httpClient.put<UpdateLostItemResponse>(
            `/api/items/${id}`,
            requestBody,
            requestConfig,
        );

        const payloadResponse = response.data;
        if (!payloadResponse.success) {
            throw new ApiError(payloadResponse.message || payloadResponse.error || "Unable to update item.", {
                status: response.status,
                data: payloadResponse,
            });
        }

        console.log("[itemsApi] updateLostItem success", {
            id,
            message: payloadResponse.message,
        });

        return payloadResponse;
    } catch (error) {
        console.log("[itemsApi] updateLostItem error", {
            id,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}

export async function deleteLostItem(
    id: number,
    config?: HttpRequestConfig,
): Promise<DeleteLostItemResponse> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[itemsApi] deleteLostItem start", { id });

    try {
        const response = await httpClient.delete<DeleteLostItemResponse>(
            `/api/items/${id}`,
            requestConfig,
        );

        const payload = response.data;

        if (!payload.success) {
            console.log("[itemsApi] deleteLostItem failed", {
                id,
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(
                payload.message || payload.error || "Unable to delete item.",
                {
                    status: response.status,
                    data: payload,
                },
            );
        }

        console.log("[itemsApi] deleteLostItem success", {
            id,
            message: payload.message,
        });

        return payload;
    } catch (error) {
        console.log("[itemsApi] deleteLostItem error", {
            id,
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}
