import { ApiError, httpClient, type HttpRequestConfig } from "./httpClient";

export interface CurrentUserResponseData {
    userId?: number | string;
    id?: number | string;
    name?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    primaryEmail?: string;
    userEmail?: string;
    profilePhoto?: string | null;
    profilePhotoUrl?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
    photo?: string | null;
    createdAt?: string;
    updatedAt?: string;
    user?: CurrentUserResponseData;
    [key: string]: unknown;
}

export interface CurrentUserResponse {
    success: boolean;
    message?: string;
    data?: CurrentUserResponseData | Record<string, unknown>;
    error?: string;
}

export interface UpdateFcmTokenResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface NormalizedUserProfile {
    userId: number;
    name: string;
    email: string;
    profilePhoto: string | null;
}

export interface UserKpis {
    itemsReported: number;
    itemsClaimed: number;
    activeAlerts: number;
}

export interface UserKpisResponse {
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
}

export interface UpdateUserProfilePayload {
    name?: string | null;
    profilePhotoUri?: string | null;
}

export interface UpdateUserProfileResult {
    success: boolean;
    message: string;
    profile: NormalizedUserProfile;
}

type UpdateUserProfileApiResponse = {
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
};

function coerceNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

export function normalizeUserProfile(payload: unknown): NormalizedUserProfile | null {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return null;
    }

    const record = payload as Record<string, unknown>;

    const unwrapRecord = (input: Record<string, unknown>): Record<string, unknown> => {
        const nestedKeys = ["user", "profile", "account", "data", "result"] as const;
        let current = input;

        for (let depth = 0; depth < 5; depth += 1) {
            let next: Record<string, unknown> | null = null;

            for (const key of nestedKeys) {
                const value = current[key];
                if (value && typeof value === "object" && !Array.isArray(value)) {
                    next = value as Record<string, unknown>;
                    break;
                }
            }

            if (!next) {
                break;
            }

            current = next;
        }

        return current;
    };

    const candidateRaw = unwrapRecord(record);

    const coerceNumber = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === "string") {
            const parsed = Number(value.trim());
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    };

    const coerceString = (value: unknown): string | null => {
        if (typeof value !== "string") {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    };

    const coerceEmail = (value: unknown): string | null => {
        const normalized = coerceString(value);
        if (!normalized) {
            return null;
        }
        return normalized.includes("@") ? normalized.toLowerCase() : null;
    };

    const numericKeys = ["userId", "id", "user_id", "userID", "uid"] as const;
    let userId: number | null = null;
    for (const key of numericKeys) {
        if (key in candidateRaw) {
            userId = coerceNumber(candidateRaw[key]);
            if (userId !== null) {
                break;
            }
        }
    }

    const nameKeys = ["name", "fullName", "displayName"] as const;
    let name: string | null = null;
    for (const key of nameKeys) {
        if (key in candidateRaw) {
            name = coerceString(candidateRaw[key]);
            if (name) {
                break;
            }
        }
    }

    const emailKeys = ["email", "primaryEmail", "userEmail", "username"] as const;
    let email: string | null = null;
    for (const key of emailKeys) {
        if (key in candidateRaw) {
            email = coerceEmail(candidateRaw[key]);
            if (email) {
                break;
            }
        }
    }

    const photoKeys = [
        "profilePhoto",
        "profilePhotoUrl",
        "profileImage",
        "profileImageUrl",
        "avatar",
        "avatarUrl",
        "image",
        "imageUrl",
        "photo",
    ] as const;
    let profilePhoto: string | null = null;
    for (const key of photoKeys) {
        if (key in candidateRaw) {
            const value = coerceString(candidateRaw[key]);
            if (value) {
                profilePhoto = value;
                break;
            }
        }
    }

    if (userId === null || !name || !email) {
        return null;
    }

    return {
        userId,
        name,
        email,
        profilePhoto,
    };
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
    console.log("[usersApi] getCurrentUser: sending request");
    try {
        const response = await httpClient.get<CurrentUserResponse>("/api/users/me");
        console.log("[usersApi] getCurrentUser: response received", {
            success: response.data?.success,
            message: response.data?.message,
        });
        return response.data;
    } catch (error) {
        console.log("[usersApi] getCurrentUser: request failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function updateUserFcmToken(fcmToken: string | null): Promise<UpdateFcmTokenResponse> {
    console.log("[usersApi] updateUserFcmToken: sending request", {
        hasToken: Boolean(fcmToken),
    });

    try {
        const response = await httpClient.post<UpdateFcmTokenResponse>(
            "/api/users/update-fcm-token",
            {
                fcmToken,
            },
        );

        console.log("[usersApi] updateUserFcmToken: response received", {
            success: response.data?.success,
            message: response.data?.message,
        });

        return response.data;
    } catch (error) {
        console.log("[usersApi] updateUserFcmToken: request failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

export async function fetchUserKpis(
    config?: HttpRequestConfig,
): Promise<UserKpis> {
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
    };

    console.log("[usersApi] fetchUserKpis: sending request");

    try {
        const response = await httpClient.get<UserKpisResponse>(
            "/api/users/me/kpis",
            requestConfig,
        );

        const payload = response.data;

        if (!payload.success || !payload.data || typeof payload.data !== "object") {
            console.log("[usersApi] fetchUserKpis: failed", {
                status: response.status,
                message: payload.message,
                error: payload.error,
            });
            throw new ApiError(payload.message || payload.error || "Unable to load KPIs.", {
                status: response.status,
                data: payload,
            });
        }

        const record = payload.data as Record<string, unknown>;

        const normalized: UserKpis = {
            itemsReported: coerceNumber(record.itemsReported ?? record.totalReported ?? 0),
            itemsClaimed: coerceNumber(record.itemsClaimed ?? record.claimedCount ?? 0),
            activeAlerts: coerceNumber(record.activeAlerts ?? record.alertsActive ?? 0),
        };

        console.log("[usersApi] fetchUserKpis: success", {
            itemsReported: normalized.itemsReported,
            itemsClaimed: normalized.itemsClaimed,
            activeAlerts: normalized.activeAlerts,
        });

        return normalized;
    } catch (error) {
        console.log("[usersApi] fetchUserKpis: request failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

function resolveProfileFileName(uri: string): string {
    const segments = uri.split(/[/\\]/);
    const last = segments.pop() ?? `profile-${Date.now()}`;
    if (last.includes(".")) {
        return last;
    }
    return `${last}.jpg`;
}

function resolveProfileMimeType(uri: string): string {
    const extension = uri.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "heic":
            return "image/heic";
        case "jpeg":
        case "jpg":
            return "image/jpeg";
        default:
            return "image/jpeg";
    }
}

function coerceStringValue(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function updateCurrentUserProfile(
    payload: UpdateUserProfilePayload,
    config?: HttpRequestConfig,
    fallbackProfile?: NormalizedUserProfile,
): Promise<UpdateUserProfileResult> {
    const formData = new FormData();
    const requestConfig: HttpRequestConfig = {
        ...(config ?? {}),
        headers: {
            ...(config?.headers ?? {}),
            "Content-Type": "multipart/form-data",
        },
    };

    if (payload.name !== undefined) {
        const trimmed = payload.name?.toString().trim();
        if (trimmed && trimmed.length > 0) {
            formData.append("name", trimmed);
        }
    }

    if (payload.profilePhotoUri) {
        const fileName = resolveProfileFileName(payload.profilePhotoUri);
        const mimeType = resolveProfileMimeType(payload.profilePhotoUri);
        const file = {
            uri: payload.profilePhotoUri,
            name: fileName,
            type: mimeType,
        } as unknown as Blob;
        formData.append("profilePhoto", file);
    }

    try {
        const response = await httpClient.patch<UpdateUserProfileApiResponse>(
            "/api/users/me",
            formData,
            requestConfig,
        );

        const payloadResponse = response.data;

        if (!payloadResponse.success || !payloadResponse.data) {
            console.log("[usersApi] updateCurrentUserProfile: failed", {
                status: response.status,
                message: payloadResponse.message,
                error: payloadResponse.error,
            });
            throw new ApiError(
                payloadResponse.message || payloadResponse.error || "Unable to update profile.",
                {
                    status: response.status,
                    data: payloadResponse,
                },
            );
        }

        let profile = normalizeUserProfile(payloadResponse.data);

        if (!profile && fallbackProfile && payloadResponse.data && typeof payloadResponse.data === "object") {
            const record = payloadResponse.data as Record<string, unknown>;
            const resolvedName =
                coerceStringValue(record.name) ?? fallbackProfile.name;
            const resolvedPhoto =
                coerceStringValue(record.profilePhoto) ??
                coerceStringValue(record.profilePhotoUrl) ??
                fallbackProfile.profilePhoto;

            profile = {
                userId: fallbackProfile.userId,
                name: resolvedName,
                email: fallbackProfile.email,
                profilePhoto: resolvedPhoto,
            };
        }

        if (!profile) {
            throw new ApiError("Received malformed profile payload.", {
                status: response.status,
                data: payloadResponse.data,
            });
        }

        const message =
            payloadResponse.message ||
            "Your profile has been updated successfully.";

        console.log("[usersApi] updateCurrentUserProfile: success", {
            userId: profile.userId,
        });

        return {
            success: true,
            message,
            profile,
        };
    } catch (error) {
        console.log("[usersApi] updateCurrentUserProfile: request failed", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
