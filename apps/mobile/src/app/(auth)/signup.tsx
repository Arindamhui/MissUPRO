import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/BrandLogo";
import { Button, Input, Screen } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth-api";
import { persistMobileAuthSession } from "@/lib/auth-session";
import { useAuthStore } from "@/store";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";

function resolveGoogleClientIds() {
  const shared = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  return {
    clientId: shared,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? shared,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? shared,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? shared,
  };
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const setMobilePanel = useAuthStore((state) => state.setMobilePanel);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"email" | "google" | null>(null);
  const googleMetadataRef = useRef<{ displayName?: string; referralCode?: string }>({});
  const googleClientIds = useMemo(resolveGoogleClientIds, []);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.clientId,
    androidClientId: googleClientIds.androidClientId,
    iosClientId: googleClientIds.iosClientId,
    webClientId: googleClientIds.webClientId,
    scopes: ["openid", "profile", "email"],
  });

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
        const session = await signInWithGoogle({
          idToken,
          displayName: googleMetadataRef.current.displayName,
          referralCode: googleMetadataRef.current.referralCode,
        });
        await persistMobileAuthSession(session);
        setMobilePanel("user");
        router.replace("/onboarding");
      } catch (authError) {
        setError(getAuthErrorMessage(authError, "Google sign up failed"));
      } finally {
        setBusyAction(null);
      }
    })();
  }, [response, setMobilePanel]);

  const validate = () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return false;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validate()) {
      return;
    }

    setError(null);
    setBusyAction("email");

    try {
      const session = await signUpWithEmail({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
      });
      await persistMobileAuthSession(session);
      setMobilePanel("user");
      router.replace("/onboarding");
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Sign up failed"));
    } finally {
      setBusyAction(null);
    }
  };

  const handleGoogleSignup = async () => {
    googleMetadataRef.current = {
      displayName: displayName.trim() || undefined,
      referralCode: referralCode.trim() || undefined,
    };

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

  return (
    <Screen style={{ backgroundColor: "#08122E" }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#10204B", "#08122E", "#060A1D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingTop: insets.top + SPACING.xl, paddingBottom: Math.max(insets.bottom, SPACING.lg), paddingHorizontal: SPACING.lg }}>
            <View style={{ alignItems: "center", marginTop: SPACING.xl, marginBottom: SPACING.xl }}>
              <BrandLogo size={116} />
              <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xl, fontWeight: "700", marginTop: SPACING.md }}>
                Create your account
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: FONT.sizes.sm, marginTop: 6, textAlign: "center" }}>
                Sign up with email or Google and finish onboarding in the app.
              </Text>
            </View>

            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 28, padding: SPACING.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Input
                label="Display name"
                placeholder="How people will see you"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
              />
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
              <Input
                label="Confirm password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
              />
              <Input
                label="Referral code"
                placeholder="Optional"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white }}
              />

              {error ? (
                <View style={{ backgroundColor: "rgba(225,112,85,0.16)", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md }}>
                  <Text style={{ color: "#FFC5B7", fontSize: FONT.sizes.sm, textAlign: "center" }}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Create account"
                onPress={handleSignup}
                loading={busyAction === "email"}
                style={{ marginTop: SPACING.sm }}
              />
              <Button
                title="Continue with Google"
                onPress={() => void handleGoogleSignup()}
                loading={busyAction === "google"}
                variant="outline"
                disabled={!request}
                style={{ marginTop: SPACING.md, borderColor: "rgba(255,255,255,0.5)" }}
              />

              <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: FONT.sizes.xs, textAlign: "center", marginTop: SPACING.md, lineHeight: 18 }}>
                By continuing, you agree to the Terms and Privacy Policy configured for MissU Pro.
              </Text>
            </View>

            <View style={{ marginTop: "auto", alignItems: "center", paddingTop: SPACING.xl }}>
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                <Text style={{ color: COLORS.white, fontSize: FONT.sizes.md }}>
                  Already have an account? <Text style={{ fontWeight: "700" }}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}
