import { Alert, Linking, Platform } from "react-native";

export function getSettingsExternalUrl(slug: string) {
  switch (slug) {
    case "privacy-policy":
      return process.env.EXPO_PUBLIC_PRIVACY_URL;
    case "about":
      return process.env.EXPO_PUBLIC_ABOUT_URL;
    case "faq":
      return process.env.EXPO_PUBLIC_FAQ_URL;
    case "facebook":
      return process.env.EXPO_PUBLIC_FACEBOOK_URL;
    case "eula":
      return process.env.EXPO_PUBLIC_EULA_URL;
    case "refund-policy":
      return process.env.EXPO_PUBLIC_REFUND_POLICY_URL;
    case "child-safety":
      return process.env.EXPO_PUBLIC_CHILD_SAFETY_URL;
    case "review":
      return Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_APP_STORE_URL
        : process.env.EXPO_PUBLIC_PLAY_STORE_URL;
    case "check-update":
      return Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_APP_STORE_URL
        : process.env.EXPO_PUBLIC_PLAY_STORE_URL;
    case "support":
    case "connect":
      return process.env.EXPO_PUBLIC_SUPPORT_URL ?? (process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_NUMBER
        ? `https://wa.me/${process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_NUMBER.replace(/\D/g, "")}`
        : undefined);
    case "terms-of-service":
      return process.env.EXPO_PUBLIC_TERMS_URL;
    default:
      return undefined;
  }
}

export async function openExternalUrl(url: string | undefined, label: string) {
  if (!url) {
    Alert.alert("Missing configuration", `${label} is not configured in the mobile environment.`);
    return;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Cannot open link", `This device cannot open ${label.toLowerCase()} right now.`);
      return;
    }
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert("Link failed", error instanceof Error ? error.message : `Unable to open ${label.toLowerCase()}.`);
  }
}