import axios, {
    AxiosError,
    AxiosHeaders,
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
    isAxiosError,
} from "axios";
import Constants from "expo-constants";

const DEFAULT_TIMEOUT = 180000;

type RequestConfig = InternalAxiosRequestConfig & {
    skipAuth?: boolean;
};

type ErrorListener = (error: ApiError) => void;

const errorListeners = new Set<ErrorListener>();
let accessToken: string | null = null;

export class ApiError extends Error {
    status?: number;
    data?: unknown;
    isNetworkError: boolean;

    constructor(message: string, options: { status?: number; data?: unknown; isNetworkError?: boolean; cause?: unknown } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = options.status;
        this.data = options.data;
        this.isNetworkError = options.isNetworkError ?? false;
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export function getBaseUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (envUrl) {
        return envUrl;
    }

    const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra) as
        | { apiBaseUrl?: string }
        | undefined;
    if (extra?.apiBaseUrl) {
        return extra.apiBaseUrl;
    }

    return "http://localhost:8080";
}

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function onApiError(listener: ErrorListener) {
    errorListeners.add(listener);
    return () => errorListeners.delete(listener);
}

function notifyError(error: ApiError) {
    errorListeners.forEach((listener) => {
        try {
            listener(error);
        } catch {
            // listener errors ignored
        }
    });
}

function normalizeError(error: unknown): ApiError {
    if (error instanceof ApiError) {
        return error;
    }

    if (isAxiosError(error)) {
        const response = error.response as AxiosResponse | undefined;
        const status = response?.status;
        const responseData = response?.data;
        const message =
            (typeof responseData === "object" && responseData !== null && "message" in responseData
                ? String((responseData as Record<string, unknown>).message)
                : undefined) ||
            error.message ||
            "Request failed";

        return new ApiError(message, {
            status,
            data: responseData,
            isNetworkError: !response,
            cause: error,
        });
    }

    const fallbackMessage =
        error instanceof Error ? error.message : "Unexpected error while contacting the server";

    return new ApiError(fallbackMessage, { cause: error });
}

export function createHttpClient(): AxiosInstance {
    const instance = axios.create({
        baseURL: getBaseUrl(),
        timeout: DEFAULT_TIMEOUT,
        headers: {
            Accept: "application/json",
        },
    });

    instance.interceptors.request.use((config: RequestConfig) => {
        if (!config.skipAuth && accessToken) {
            const headers = config.headers ?? new AxiosHeaders();

            if (headers instanceof AxiosHeaders) {
                headers.set("Authorization", `Bearer ${accessToken}`);
            } else if (!("Authorization" in headers)) {
                (headers as Record<string, unknown>).Authorization = `Bearer ${accessToken}`;
            }

            config.headers = headers;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: AxiosError) => {
            const apiError = normalizeError(error);
            notifyError(apiError);
            return Promise.reject(apiError);
        },
    );

    return instance;
}

export const httpClient = createHttpClient();