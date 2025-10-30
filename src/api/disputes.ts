import { ApiError, httpClient, type HttpRequestConfig } from "./httpClient";

export type DisputeStatus = "PENDING" | "RESOLVED" | "REJECTED" | string;

export interface Dispute {
    disputeId: string;
    itemId: number;
    disputerId: string;
    status: DisputeStatus;
    createdAt: string;
    updatedAt: string;
}

export interface SubmitDisputeResponse {
    success: boolean;
    message: string;
    data: Dispute | null;
}

/**
 * Submit a dispute for a claimed item
 * @param itemId The ID of the item to dispute
 * @param config Optional HTTP request config (signal, etc.)
 * @returns Promise resolving to the dispute response
 */
export async function submitDispute(
    itemId: number,
    config?: HttpRequestConfig
): Promise<SubmitDisputeResponse> {
    console.log("[disputesApi] submitDispute start", { itemId });

    try {
        const response = await httpClient.post<SubmitDisputeResponse>(
            `/api/dispute/${itemId}`,
            {},
            config
        );

        console.log("[disputesApi] submitDispute success", {
            disputeId: response.data.data?.disputeId,
            status: response.data.data?.status,
        });

        return response.data;
    } catch (error) {
        const apiError =
            error instanceof ApiError
                ? error
                : new ApiError(String(error ?? "Unexpected error"), { cause: error });

        console.error("[disputesApi] submitDispute failed", {
            itemId,
            status: apiError.status,
            message: apiError.message,
            data: apiError.data,
        });

        // Handle known backend responses gracefully and return structured result
        if (apiError.status === 409 || apiError.status === 404) {
            return {
                success: false,
                message: apiError.message || "Unable to submit dispute.",
                data: null,
            };
        }

        // For other errors, rethrow so callers can handle/log as before
        throw apiError;
    }
}
