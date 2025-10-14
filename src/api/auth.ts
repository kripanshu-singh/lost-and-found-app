import { httpClient } from "./httpClient";

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    profilePhotoUri?: string | null;
}

export interface RegisterResponseData {
    userId: number;
    name: string;
    email: string;
    profilePhoto?: string | null;
    createdAt: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    data?: RegisterResponseData;
    error?: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface LoginResponseData {
    accessToken: string;
    refreshToken: string;
    userId: number;
    name: string;
    email: string;
    profilePhoto?: string | null;
    [key: string]: unknown;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data?: LoginResponseData | Record<string, unknown>;
    error?: string;
}

function extractFileName(uri: string) {
    const segments = uri.split(/[/\\]/);
    const lastSegment = segments.pop() ?? "profilePhoto";
    return lastSegment.includes(".") ? lastSegment : `${lastSegment}.jpg`;
}

function resolveMimeType(uri: string) {
    const extension = uri.split(".").pop()?.toLowerCase();
    switch (extension) {
        case "png":
            return "image/png";
        case "jpeg":
        case "jpg":
            return "image/jpeg";
        case "webp":
            return "image/webp";
        case "heic":
            return "image/heic";
        default:
            return "image/jpeg";
    }
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("email", payload.email);
    formData.append("password", payload.password);

    if (payload.profilePhotoUri) {
        formData.append("profilePhoto", {
            uri: payload.profilePhotoUri,
            name: extractFileName(payload.profilePhotoUri),
            type: resolveMimeType(payload.profilePhotoUri),
        } as unknown as Blob);
    }

    const response = await httpClient.post<RegisterResponse>("/api/users/register", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>("/api/auth/login", payload, {
        headers: {
            "Content-Type": "application/json",
        },
    });

    return response.data;
}
