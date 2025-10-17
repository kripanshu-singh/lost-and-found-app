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
    postedByUserId: number;
    claimedByUserId: number | null;
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
        const file = {
            uri,
            name: extractFileName(uri, "item-image", index),
            type: resolveMimeType(uri),
        } as unknown as Blob;
        console.log(`\n ~ reportLostItem ~ file :- `, file);

        if (index === 0) {
            formData.append("images", file);
        }
        // formData.append("images[]", file);
    });

    const config: HttpRequestConfig = {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    };

    const response = await httpClient.post<ReportLostItemResponse>(
        "/api/items/report",
        formData,
        config,
    );

    return response.data;
}

export async function fetchLostItems(
    params: FetchLostItemsParams = {},
    config?: HttpRequestConfig,
): Promise<PagedLostItems> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
        params: {
            ...(config?.params as Record<string, unknown> | undefined),
            ...params,
        },
    };

    const response = await httpClient.get<LostItemsApiResponse>("/api/items", requestConfig);
    const payload = response.data;

    if (!payload.success || !payload.data) {
        throw new ApiError(payload.message || payload.error || "Unable to fetch items.", {
            status: response.status,
            data: payload,
        });
    }

    return payload.data;
}
