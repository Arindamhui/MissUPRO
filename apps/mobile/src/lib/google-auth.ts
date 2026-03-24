import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  "268507553885-8jgmola920skkvj3ago964mbeuevs058.apps.googleusercontent.com";

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
  "268507553885-gstjmb0fgggotdimnuak06di0oe2b1lg.apps.googleusercontent.com";

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? GOOGLE_WEB_CLIENT_ID;

export function useGoogleAuth() {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  const promptGoogleAuth = useCallback(async (): Promise<string | null> => {
    if (!request) {
      throw new Error("Google sign in is still loading. Try again in a moment.");
    }

    const result = await promptAsync();

    if (result.type === "dismiss" || result.type === "cancel") {
      return null;
    }

    if (result.type !== "success") {
      throw new Error("Google sign in did not complete successfully");
    }

    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error("Google did not return an ID token");
    }

    return idToken;
  }, [promptAsync, request]);

  return {
    isReady: Boolean(request),
    promptGoogleAuth,
  };
}
