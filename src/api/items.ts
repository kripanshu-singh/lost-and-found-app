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
    profilePhotoUrl?: string | null;
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
    claimedBy?: ItemPersonReference | null;
}

type ItemDetailApiResponse = {
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
