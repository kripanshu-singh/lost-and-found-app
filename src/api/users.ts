import { httpClient } from "./httpClient";

export interface CurrentUserResponseData {
    userId: number;
    name: string;
    email: string;
    profilePhoto?: string | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CurrentUserResponse {
    success: boolean;
    message?: string;
    data?: CurrentUserResponseData | Record<string, unknown>;
    error?: string;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await httpClient.get<CurrentUserResponse>("/api/users/me");
    return response.data;
}
