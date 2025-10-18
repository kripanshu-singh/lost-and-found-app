import { ApiError, httpClient, type HttpRequestConfig } from "./httpClient";
import { type ItemCategory } from "./items";

export interface LostItemAlertUser {
    id: number;
    name?: string | null;
    profilePhoto?: string | null;
    profilePhotoUrl?: string | null;
    fcmToken?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    [key: string]: unknown;
}

export interface LostItemAlert {
    id: number;
    user?: LostItemAlertUser | null;
    category: ItemCategory;
    keywords: string;
    latitude?: number | null;
    longitude?: number | null;
    locationDescription?: string | null;
    dateLost?: string | null;
    isActive?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    [key: string]: unknown;
}

export interface CreateLostItemAlertPayload {
    category: ItemCategory;
    keywords: string;
    latitude?: number | null;
    longitude?: number | null;
    locationDescription?: string | null;
    dateLost?: string | null;
}

export interface CreateLostItemAlertResponse {
    success: boolean;
    message?: string;
    data?: LostItemAlert;
    error?: string;
}

export async function createLostItemAlert(
    payload: CreateLostItemAlertPayload,
    config?: HttpRequestConfig,
): Promise<CreateLostItemAlertResponse> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    const requestBody: Record<string, unknown> = {
        category: payload.category,
        keywords: payload.keywords.trim(),
    };

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

    if (payload.locationDescription !== undefined) {
        const trimmed = payload.locationDescription?.trim();
        requestBody.locationDescription = trimmed?.length ? trimmed : null;
    }

    if (payload.dateLost !== undefined) {
        requestBody.dateLost = payload.dateLost || null;
    }

    try {
        const response = await httpClient.post<CreateLostItemAlertResponse>(
            "/api/alerts",
            requestBody,
            requestConfig,
        );

        const payloadResponse = response.data;
        if (!payloadResponse.success) {
            throw new ApiError(
                payloadResponse.message || payloadResponse.error || "Unable to create alert.",
                {
                    status: response.status,
                    data: payloadResponse,
                },
            );
        }

        console.log("[alertsApi] createLostItemAlert success", {
            message: payloadResponse.message,
        });

        return payloadResponse;
    } catch (error) {
        console.log("[alertsApi] createLostItemAlert error", {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}
