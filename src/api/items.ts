import { Platform } from "react-native";
import { httpClient, type HttpRequestConfig } from "./httpClient";

export type ItemCategory =
    | "WALLET"
    | "PHONE"
    | "KEYS"
    | "BAG"
    | "DOCUMENT"
    | "ELECTRONIC"
    | "OTHER";

export interface ReportLostItemPayload {
    itemName: string;
    category: ItemCategory;
    description?: string;
    locationFound?: string;
    dateFound?: string;
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
    if (payload.locationFound) {
        formData.append("locationFound", payload.locationFound.trim());
    }
    if (payload.dateFound) {
        formData.append("dateFound", payload.dateFound);
    }

    payload.imageUris?.slice(0, 5).forEach((uri, index) => {
        const file = {
            uri,
            name: extractFileName(uri, "item-image", index),
            type: resolveMimeType(uri),
        } as unknown as Blob;

        if (index === 0) {
            formData.append("images", file);
        }
        formData.append("images[]", file);
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
