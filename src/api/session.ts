import * as SecureStore from "expo-secure-store";
import { setAccessToken } from "./httpClient";

const SESSION_KEY = "authSession";

export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    userId: number;
    name: string;
    email: string;
    profilePhoto: string | null;
}

export class SessionError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message);
        this.name = "SessionError";
        if (options?.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

export async function saveSession(session: AuthSession): Promise<void> {
    try {
        const payload: AuthSession = {
            ...session,
            profilePhoto: session.profilePhoto ?? null,
        };

        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(payload));
        setAccessToken(payload.accessToken);
    } catch (error) {
        throw new SessionError("Failed to persist session", { cause: error });
    }
}

export async function loadSession(): Promise<AuthSession | null> {
    try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (!raw) {
            setAccessToken(null);
            return null;
        }

        const parsed = JSON.parse(raw) as Partial<AuthSession>;
        if (!parsed?.accessToken || !parsed?.refreshToken) {
            await clearSession();
            return null;
        }

        const session: AuthSession = {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            userId: parsed.userId ?? -1,
            name: parsed.name ?? "",
            email: parsed.email ?? "",
            profilePhoto: parsed.profilePhoto ?? null,
        };

        setAccessToken(session.accessToken);
        return session;
    } catch (error) {
        await clearSession();
        throw new SessionError("Failed to load session", { cause: error });
    }
}

export async function clearSession(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
    } finally {
        setAccessToken(null);
    }
}
