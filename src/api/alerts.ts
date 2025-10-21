import { ApiError, httpClient, type HttpRequestConfig } from "./httpClient";
import { normalizeItemCategory, type ItemCategory } from "./items";

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

type MyAlertsApiResponse = {
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

function coerceBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1" || normalized === "active") {
            return true;
        }
        if (normalized === "false" || normalized === "0" || normalized === "inactive") {
            return false;
        }
    }
    return null;
}

function normalizeLostItemAlert(raw: unknown): LostItemAlert | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }

    const record = raw as Record<string, unknown>;

    const id = coerceNumber(record.id ?? record.alertId);
    const keywords = coerceString(record.keywords ?? record.searchTerms ?? "");

    if (id === null || !keywords) {
        return null;
    }

    const latitude = coerceNumber(record.latitude);
    const longitude = coerceNumber(record.longitude);
    const createdAt = coerceString(record.createdAt ?? record.created_on);
    const updatedAt = coerceString(record.updatedAt ?? record.updated_on);
    const dateLost = coerceString(record.dateLost ?? record.date);
    const locationDescription = coerceString(record.locationDescription ?? record.location);

    const category = normalizeItemCategory(record.category ?? record.itemCategory);
    const isActive = coerceBoolean(record.isActive ?? record.active ?? record.status);

    const userSource = record.user ?? record.owner;
    const user =
        userSource && typeof userSource === "object" && !Array.isArray(userSource)
            ? (userSource as LostItemAlertUser)
            : undefined;

    const normalized: LostItemAlert = {
        id,
        user,
        category,
        keywords,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationDescription,
        dateLost,
        isActive: isActive ?? undefined,
        createdAt,
        updatedAt,
    };

    return normalized;
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

export async function fetchMyAlerts(
    config?: HttpRequestConfig,
): Promise<LostItemAlert[]> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[alertsApi] fetchMyAlerts start");

    try {
        const response = await httpClient.get<MyAlertsApiResponse>(
            "/api/alerts/my-alerts",
            requestConfig,
        );
        const payload = response.data;

        if (!payload.success || !Array.isArray(payload.data)) {
            console.log("[alertsApi] fetchMyAlerts failed", {
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(payload.message || payload.error || "Unable to load alerts.", {
                status: response.status,
                data: payload,
            });
        }

        const normalized = payload.data
            .map((entry) => normalizeLostItemAlert(entry))
            .filter((entry): entry is LostItemAlert => Boolean(entry));

        console.log("[alertsApi] fetchMyAlerts success", {
            count: normalized.length,
        });

        return normalized;
    } catch (error) {
        console.log("[alertsApi] fetchMyAlerts error", {
            error: error instanceof Error ? error.message : error,
        });
        throw error;
    }
}
