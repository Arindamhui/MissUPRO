import { useCallback, useEffect, useState } from "react";

let GoogleSignin: any = null;
try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch {
  // Native module not available (e.g., Expo Go)
}

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  "268507553885-8jgmola920skkvj3ago964mbeuevs058.apps.googleusercontent.com";

export function useGoogleAuth() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!GoogleSignin) return;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    setIsReady(true);
  }, []);

  const promptGoogleAuth = useCallback(async (): Promise<string | null> => {
    if (!GoogleSignin) {
      throw new Error("Google Sign-In is not available in Expo Go. Use a development build.");
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign out first so the account picker always appears
    try { await GoogleSignin.signOut(); } catch { /* ignore if not signed in */ }

    const response = await GoogleSignin.signIn();

    if ("type" in response && response.type === "cancelled") {
      return null;
    }

    const idToken = response.data?.idToken ?? null;
    if (!idToken) {
      throw new Error("Google did not return an ID token");
    }

    return idToken;
  }, []);

  return {
    isReady,
    promptGoogleAuth,
  };
}
