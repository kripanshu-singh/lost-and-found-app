import { httpClient } from "./httpClient";

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

export interface NormalizedUserProfile {
    userId: number;
    name: string;
    email: string;
    profilePhoto: string | null;
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
