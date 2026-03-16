import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { COLORS } from "@/theme";

/**
 * Clerk redirects here after external OAuth (e.g. Google).
 * Deep link: missupro://sso-callback?created_session_id=...&rotating_token_nonce=...
 *
 * Clerk's internal session handling picks up the query params automatically.
 * This screen just shows a spinner while the session activates, then redirects.
 */
export default function SSOCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn]);

  // Fallback: if Clerk doesn't resolve within 5 seconds, go to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
