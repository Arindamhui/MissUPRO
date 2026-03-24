import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { BrandLogo } from "@/components/BrandLogo";
import { Button, Input, Screen } from "@/components/ui";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { signInWithEmail, signInWithGoogle, type MobileAuthSession } from "@/lib/auth-api";
import { persistMobileAuthSession } from "@/lib/auth-session";
import { useGoogleAuth } from "@/lib/google-auth";
import { useAuthStore } from "@/store";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const setMobilePanel = useAuthStore((state) => state.setMobilePanel);
  const { isReady: isGoogleReady, promptGoogleAuth } = useGoogleAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"email" | "google" | "guest" | null>(null);

  const finalizeSignIn = useCallback(async (session: MobileAuthSession) => {
    await persistMobileAuthSession(session);
    setMobilePanel("user");
    router.replace("/(tabs)");
  }, [setMobilePanel]);

  const validateForm = () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return false;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
    setError(null);
    setBusyAction("google");

    try {
      const idToken = await promptGoogleAuth();
      if (!idToken) {
        setBusyAction(null);
        return;
      }
      const session = await signInWithGoogle({ idToken });
      await finalizeSignIn(session);
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Google sign in failed"));
    } finally {
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
    <Screen style={{ backgroundColor: "#08122E", padding: 0 }}>
      <BackgroundCollage variant="auth" />
      <AnimatedSnow density={16} />
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(5,10,31,0.22)", "rgba(10,16,48,0.44)", "rgba(5,8,26,0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ flex: 1, paddingTop: insets.top + SPACING.xl, paddingBottom: Math.max(insets.bottom, SPACING.lg), paddingHorizontal: SPACING.lg }}>
              <View style={{ alignItems: "center", marginTop: SPACING.lg, marginBottom: SPACING.xl + 4 }}>
                <BrandLogo size={120} />
                <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xl, fontWeight: "700", marginTop: SPACING.md }}>
                  Sign in to MissU Pro
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: FONT.sizes.sm, marginTop: 6, textAlign: "center" }}>
                  Email login and Google OAuth now run through the MissU backend.
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(9,16,46,0.54)",
                  borderRadius: 32,
                  padding: SPACING.lg,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  shadowColor: "#000000",
                  shadowOpacity: 0.28,
                  shadowRadius: 22,
                  shadowOffset: { width: 0, height: 14 },
                }}
              >
                <Input
                  label="Email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white, borderRadius: RADIUS.xl, minHeight: 54 }}
                />
                <Input
                  label="Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secure
                  style={{ backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white, borderRadius: RADIUS.xl, minHeight: 54 }}
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
                  style={{ marginTop: SPACING.sm, borderRadius: RADIUS.full, height: 54, backgroundColor: "#6F63F6" }}
                />
                <Button
                  title="Continue with Google"
                  onPress={() => void handleGoogleLogin()}
                  loading={busyAction === "google"}
                  disabled={!isGoogleReady}
                  variant="outline"
                  style={{ marginTop: SPACING.md, borderColor: "rgba(135,188,255,0.72)", borderRadius: RADIUS.full, height: 54, backgroundColor: "rgba(64,136,245,0.16)" }}
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
                <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: FONT.sizes.sm, textAlign: "center", marginTop: SPACING.xl, paddingHorizontal: SPACING.lg }}>
                  By logging in, you confirm you are over 18 years old and agree to our Terms and Privacy Policy.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Screen>
  );
}
