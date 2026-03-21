import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/BrandLogo";
import { Button, Input, Screen } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { loginAsAgencyModel, signInWithEmail, signInWithGoogle, type MobileAuthSession } from "@/lib/auth-api";
import { persistMobileAuthSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";

const AGENCY_ID_PATTERN = /^(AG\d{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function resolveGoogleClientIds() {
  const shared = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  return {
    clientId: shared,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? shared,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? shared,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? shared,
  };
}

function resolveRouteForAgencyStatus(status?: string) {
  return status === "needs_onboarding" ? "/onboarding" : "/(tabs)";
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const setMobilePanel = useAuthStore((state) => state.setMobilePanel);
  const [loginPanel, setLoginPanel] = useState<"user" | "agency_model">("user");
  const [agencyId, setAgencyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"email" | "google" | "guest" | null>(null);
  const googleClientIds = useMemo(resolveGoogleClientIds, []);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.clientId,
    androidClientId: googleClientIds.androidClientId,
    iosClientId: googleClientIds.iosClientId,
    webClientId: googleClientIds.webClientId,
    scopes: ["openid", "profile", "email"],
  });

  const isAgencyIdValid = useMemo(
    () => loginPanel === "user" || AGENCY_ID_PATTERN.test(agencyId.trim()),
    [agencyId, loginPanel],
  );

  const finalizeSignIn = useCallback(async (session: MobileAuthSession) => {
    await persistMobileAuthSession(session);

    if (loginPanel !== "agency_model") {
      setMobilePanel("user");
      router.replace("/(tabs)");
      return;
    }

    const agencySession = await loginAsAgencyModel(session.token, agencyId.trim());
    setMobilePanel(
      agencySession.panel,
      agencySession.agencyId ?? null,
      agencySession.agencyName ?? null,
    );

    if (agencySession.status === "access_denied") {
      throw new Error("This account cannot join the selected agency.");
    }

    if (agencySession.reason === "agency_not_found") {
      throw new Error("The agency ID was not found.");
    }

    if (agencySession.reason === "agency_not_approved") {
      throw new Error("This agency is not approved yet.");
    }

    router.replace(resolveRouteForAgencyStatus(agencySession.status));
  }, [agencyId, loginPanel, setMobilePanel]);

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type !== "success") {
      if (response.type !== "dismiss" && response.type !== "cancel") {
        setBusyAction(null);
      }
      return;
    }

    const idToken = response.params?.id_token;
    if (!idToken) {
      setBusyAction(null);
      setError("Google did not return an ID token.");
      return;
    }

    void (async () => {
      try {
        const session = await signInWithGoogle({ idToken });
        await finalizeSignIn(session);
      } catch (authError) {
        setError(getAuthErrorMessage(authError, "Google sign in failed"));
      } finally {
        setBusyAction(null);
      }
    })();
  }, [finalizeSignIn, response]);

  const validateForm = () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }

    if (loginPanel === "agency_model" && !isAgencyIdValid) {
      setError("Enter a valid agency ID provided by your agency.");
      return false;
    }

    return true;
  };

  const handleEmailLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setError(null);
    setBusyAction("email");

    try {
      const session = await signInWithEmail({
        email: email.trim(),
        password,
      });
      await finalizeSignIn(session);
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Login failed"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (loginPanel === "agency_model" && !isAgencyIdValid) {
      setError("Enter a valid agency ID provided by your agency.");
      return;
    }

    if (!request) {
      setError("Google sign in is still loading. Try again in a moment.");
      return;
    }

    if (!googleClientIds.clientId && !googleClientIds.androidClientId && !googleClientIds.iosClientId && !googleClientIds.webClientId) {
      setError("Google sign in is not configured for the mobile app.");
      return;
    }

    setError(null);
    setBusyAction("google");

    const result = await promptAsync();
    if (result.type !== "success") {
      setBusyAction(null);
    }
  };

  const handleGuestAccess = async () => {
    setBusyAction("guest");
    setError(null);

    try {
      const guestId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const guestName = `Guest ${guestId.slice(-4).toUpperCase()}`;
      continueAsGuest(guestId, guestName);
      router.replace("/(tabs)");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Screen style={{ backgroundColor: "#08122E" }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#10204B", "#08122E", "#060A1D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, paddingTop: insets.top + SPACING.xl, paddingBottom: Math.max(insets.bottom, SPACING.lg), paddingHorizontal: SPACING.lg }}>
            <View style={{ alignItems: "center", marginTop: SPACING.xl, marginBottom: SPACING.xl }}>
              <BrandLogo size={120} />
              <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xl, fontWeight: "700", marginTop: SPACING.md }}>
                Sign in to MissU Pro
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: FONT.sizes.sm, marginTop: 6, textAlign: "center" }}>
                Email login and Google OAuth now run through the MissU backend.
              </Text>
            </View>

            <View style={{ flexDirection: "row", borderRadius: RADIUS.full, backgroundColor: "rgba(255,255,255,0.08)", padding: 4, marginBottom: SPACING.lg }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLoginPanel("user");
                  setError(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: RADIUS.full,
                  alignItems: "center",
                  backgroundColor: loginPanel === "user" ? "rgba(255,255,255,0.18)" : "transparent",
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: loginPanel === "user" ? "700" : "500" }}>
                  User / Model
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setLoginPanel("agency_model");
                  setError(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: RADIUS.full,
                  alignItems: "center",
                  backgroundColor: loginPanel === "agency_model" ? "rgba(255,255,255,0.18)" : "transparent",
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: loginPanel === "agency_model" ? "700" : "500" }}>
                  Agency Model
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 28, padding: SPACING.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              {loginPanel === "agency_model" ? (
                <Input
                  label="Agency ID"
                  placeholder="Enter your agency ID"
                  value={agencyId}
                  onChangeText={setAgencyId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
                />
              ) : null}

              <Input
                label="Email"
                placeholder="you@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
              />
              <Input
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secure
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
              />

              {error ? (
                <View style={{ backgroundColor: "rgba(225,112,85,0.16)", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md }}>
                  <Text style={{ color: "#FFC5B7", fontSize: FONT.sizes.sm, textAlign: "center" }}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Sign in with email"
                onPress={handleEmailLogin}
                loading={busyAction === "email"}
                style={{ marginTop: SPACING.sm }}
              />
              <Button
                title="Continue with Google"
                onPress={() => void handleGoogleLogin()}
                loading={busyAction === "google"}
                variant="outline"
                disabled={!request}
                style={{ marginTop: SPACING.md, borderColor: "rgba(255,255,255,0.5)" }}
              />
              <Button
                title="Continue as guest"
                onPress={() => void handleGuestAccess()}
                loading={busyAction === "guest"}
                variant="ghost"
                style={{ marginTop: SPACING.md }}
              />
            </View>

            <View style={{ marginTop: "auto", alignItems: "center", paddingTop: SPACING.xl }}>
              <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                <Text style={{ color: COLORS.white, fontSize: FONT.sizes.md }}>
                  Need an account? <Text style={{ fontWeight: "700" }}>Create one</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Alert.alert("Reset password", "Password reset is not wired into the new backend flow yet.")}
                style={{ marginTop: SPACING.md }}
              >
                <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: FONT.sizes.sm }}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}
