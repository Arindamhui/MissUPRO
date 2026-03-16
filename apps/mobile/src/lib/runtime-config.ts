import { Platform } from "react-native";

export function getMobileRuntimeScope() {
  return {
    platform: Platform.OS === "ios" ? "IOS" as const : "ANDROID" as const,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "dev",
  };
}

export function getMobileLayoutScope() {
  return {
    platform: "MOBILE" as const,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "dev",
  };
}