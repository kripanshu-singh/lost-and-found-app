import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const ANDROID_CHANNEL_ID = "lost-item-alerts";
const CHANNEL_NAME = "Lost Item Alerts";

export async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log("[notifications] Skipping push registration (not a device)");
        return null;
    }

    if (Constants.executionEnvironment === "storeClient") {
        console.log(
            "[notifications] Remote push requires a development build (Expo Go not supported)",
        );
        return null;
    }

    try {
        const Notifications = await import("expo-notifications");
        const existingPermission = await Notifications.getPermissionsAsync();
        let finalStatus = existingPermission.status;

        if (existingPermission.status !== "granted") {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }

        if (finalStatus !== "granted") {
            console.log("[notifications] Push permissions not granted", {
                status: finalStatus,
            });
            return null;
        }

        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
                name: CHANNEL_NAME,
                importance: Notifications.AndroidImportance.HIGH,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                sound: "default",
                vibrationPattern: [0, 250, 250, 250],
                enableVibrate: true,
                enableLights: true,
                lightColor: "#2563EB",
            });
        }

        const tokenResult = await Notifications.getDevicePushTokenAsync();
        const token = tokenResult?.data?.trim();

        if (!token) {
            console.log("[notifications] getDevicePushTokenAsync returned empty token");
            return null;
        }

        console.log("[notifications] FCM token acquired", {
            platform: Platform.OS,
            tokenPreview: `${token.slice(0, 8)}…${token.slice(-6)}`,
        });

        return token;
    } catch (error) {
        console.log("[notifications] registerForPushNotifications failed", {
            error: error instanceof Error ? error.message : error,
        });
        return null;
    }
}
