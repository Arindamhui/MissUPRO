import { useSSO, useSignUp } from "@clerk/clerk-expo";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Screen, Button, Input } from "@/components/ui";
import { COLORS, SPACING, FONT, RADIUS } from "@/theme";
import { getClerkErrorMessage } from "@/lib/clerk";
import { router } from "expo-router";

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const validate = () => {
    if (!displayName.trim()) return "Display name is required";
    if (!email.trim() || !email.includes("@")) return "Valid email is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSignup = async () => {
    if (!signUp) {
      setError("Authentication is still loading. Try again.");
      return;
    }

    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp.password({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: {
          displayName: displayName.trim(),
          referralCode: referralCode.trim() || undefined,
        },
      });

      await signUp.verifications.sendEmailCode();
      setStep("verify");
    } catch (error) {
      setError(getClerkErrorMessage(error, "Signup failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUp) {
      setError("Authentication is still loading. Try again.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim(),
      });

      if (signUp.status !== "complete") {
        setError("Verification is not complete yet.");
        return;
      }

      await signUp.finalize({
        navigate: () => {
          router.replace("/(tabs)");
        },
      });
    } catch (error) {
      setError(getClerkErrorMessage(error, "Verification failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        unsafeMetadata: {
          displayName: displayName.trim() || undefined,
          referralCode: referralCode.trim() || undefined,
        },
      });

      if (!createdSessionId || !setActive) {
        setError("Google sign up was cancelled or could not be completed.");
        return;
      }

      await setActive({ session: createdSessionId });
      // Navigation is handled by (auth)/_layout.tsx redirect when isSignedIn becomes true
    } catch (error) {
      setError(getClerkErrorMessage(error, "Google sign up failed"));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <Screen style={{ justifyContent: "center", padding: SPACING.lg }}>
        <View style={{ alignItems: "center", marginBottom: SPACING.xxl }}>
          <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>📧</Text>
          <Text style={{ fontSize: FONT.sizes.xl, fontWeight: "700", color: COLORS.text }}>
            Verify Your Email
          </Text>
          <Text
            style={{
              fontSize: FONT.sizes.md,
              color: COLORS.textSecondary,
              marginTop: SPACING.sm,
              textAlign: "center",
              paddingHorizontal: SPACING.lg,
            }}
          >
            We sent a verification link to {email}. Check your inbox and tap the link to continue.
          </Text>
        </View>

        {error ? (
          <Text style={{ color: COLORS.error, textAlign: "center", marginBottom: SPACING.md }}>
            {error}
          </Text>
        ) : null}

        <Input
          label="Verification Code"
          placeholder="Enter the code from your email"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
        />

        <Button title="I've Verified My Email" onPress={handleVerify} loading={loading} />

        <TouchableOpacity
          onPress={() => void signUp?.verifications.sendEmailCode()}
          style={{ alignItems: "center", marginTop: SPACING.md }}
        >
          <Text style={{ color: COLORS.primary, fontSize: FONT.sizes.sm }}>
            Send a new code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setStep("form")}
          style={{ alignItems: "center", marginTop: SPACING.lg }}
        >
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.sm }}>
            Go back and edit details
          </Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen scroll style={{ padding: SPACING.lg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ alignItems: "center", marginBottom: SPACING.xl, marginTop: SPACING.xxl }}>
          <Text style={{ fontSize: FONT.sizes.hero, fontWeight: "700", color: COLORS.primary }}>
            MissU
          </Text>
          <Text style={{ fontSize: FONT.sizes.xl, fontWeight: "600", color: COLORS.text }}>
            Create Account
          </Text>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: COLORS.error + "15",
              padding: SPACING.md,
              borderRadius: RADIUS.md,
              marginBottom: SPACING.md,
            }}
          >
            <Text style={{ color: COLORS.error, fontSize: FONT.sizes.sm, textAlign: "center" }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Input
          label="Display Name"
          placeholder="How others will see you"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <Input
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          secure
        />

        <Input
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secure
        />

        <Input
          label="Referral Code (optional)"
          placeholder="Enter a friend's code"
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
        />

        <Button
          title="Create Account"
          onPress={handleSignup}
          loading={loading}
          style={{ marginTop: SPACING.md }}
        />

        <View style={{ alignItems: "center", marginVertical: SPACING.lg }}>
          <View style={{ height: 1, backgroundColor: COLORS.border, alignSelf: "stretch" }} />
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: FONT.sizes.sm,
              backgroundColor: COLORS.background,
              marginTop: -10,
              paddingHorizontal: SPACING.md,
            }}
          >
            or continue with
          </Text>
        </View>

        <Button
          title="Continue with Google"
          onPress={handleGoogleSignup}
          loading={googleLoading}
          variant="outline"
          style={{ borderRadius: RADIUS.lg }}
        />

        <Text
          style={{
            fontSize: FONT.sizes.xs,
            color: COLORS.textSecondary,
            textAlign: "center",
            marginTop: SPACING.md,
            lineHeight: 18,
          }}
        >
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignItems: "center", marginTop: SPACING.lg, marginBottom: SPACING.xxl }}
        >
          <Text style={{ color: COLORS.primary, fontSize: FONT.sizes.md }}>
            Already have an account? <Text style={{ fontWeight: "600" }}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <View nativeID="clerk-captcha" />
      </KeyboardAvoidingView>
    </Screen>
  );
}
