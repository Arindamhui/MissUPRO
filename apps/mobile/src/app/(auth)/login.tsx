import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthDivider } from "@/components/AuthDivider";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { SocialButton } from "@/components/SocialButton";
import { getClerkErrorMessage } from "@/lib/clerk";
import { useAuthStore } from "@/store";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "sent">("idle");
  const [busyAction, setBusyAction] = useState<"google" | "facebook" | "phone-send" | "phone-verify" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const { signIn, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const otpInputRef = useRef<TextInput | null>(null);

  const whatsappSupportNumber = process.env.EXPO_PUBLIC_WHATSAPP_SUPPORT_NUMBER;
  const xPageUrl = process.env.EXPO_PUBLIC_X_URL;
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timeout = setTimeout(() => setResendIn((current) => current - 1), 1000);
    return () => clearTimeout(timeout);
  }, [resendIn]);

  const isPhoneNumberValid = useMemo(() => /^\+[1-9]\d{7,14}$/.test(phoneNumber.trim()), [phoneNumber]);

  const openExternalUrl = async (url: string | undefined, missingLabel: string) => {
    if (!url) {
      Alert.alert("Missing configuration", `${missingLabel} is not configured in the mobile environment.`);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Cannot open link", `This device cannot open ${missingLabel.toLowerCase()} right now.`);
        return;
      }
      await Linking.openURL(url);
    } catch (linkError) {
      Alert.alert("Link failed", getClerkErrorMessage(linkError, `Unable to open ${missingLabel.toLowerCase()}.`));
    }
  };

  const handleOAuth = async (strategy: "oauth_google" | "oauth_facebook", action: "google" | "facebook") => {
    setError(null);
    setBusyAction(action);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });

      if (!createdSessionId || !setActive) {
        setError("The social sign-in flow was cancelled before a session could be created.");
        return;
      }

      await setActive({ session: createdSessionId });
      router.replace("/(tabs)");
    } catch (oauthError) {
      setError(getClerkErrorMessage(oauthError, "Social sign in failed"));
    } finally {
      setBusyAction(null);
    }
  };

  const getPhoneFactorId = (resource: NonNullable<typeof signIn>) => {
    const factor = resource.supportedFirstFactors?.find((current) => current.strategy === "phone_code");
    return factor && "phoneNumberId" in factor ? factor.phoneNumberId : null;
  };

  const handlePhoneSendCode = async () => {
    if (!signIn || !setActive) {
      setError("Authentication is still loading. Try again in a moment.");
      return;
    }

    if (!isPhoneNumberValid) {
      setError("Enter a valid phone number in E.164 format, for example +919876543210.");
      return;
    }

    setBusyAction("phone-send");
    setError(null);

    try {
      const nextSignIn = await signIn.create({ strategy: "phone_code", identifier: phoneNumber.trim() });
      const phoneNumberId = getPhoneFactorId(nextSignIn);

      if (!phoneNumberId) {
        setError("Phone sign in is enabled in the app, but no phone factor is available for this identifier.");
        return;
      }

      await nextSignIn.prepareFirstFactor({ strategy: "phone_code", phoneNumberId });
      setPhoneStatus("sent");
      setOtpCode("");
      setResendIn(30);
      requestAnimationFrame(() => otpInputRef.current?.focus());
    } catch (phoneError) {
      setError(getClerkErrorMessage(phoneError, "Unable to send the verification code"));
    } finally {
      setBusyAction(null);
    }
  };

  const handlePhoneVerify = async () => {
    if (!signIn) {
      setError("Authentication is still loading. Try again in a moment.");
      return;
    }

    if (otpCode.trim().length !== 6) {
      setError("Enter the 6-digit code that was sent to your phone.");
      return;
    }

    setBusyAction("phone-verify");
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({ strategy: "phone_code", code: otpCode.trim() });
      if (result.status !== "complete") {
        setError("Phone verification is not complete yet. Request a fresh code and try again.");
        return;
      }

      if (!result.createdSessionId) {
        setError("Phone verification completed, but no Clerk session was created.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/(tabs)");
    } catch (verifyError) {
      setError(getClerkErrorMessage(verifyError, "The verification code is invalid or expired"));
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

  const resetPhoneFlow = () => {
    setPhoneStatus("idle");
    setOtpCode("");
    setResendIn(0);
    setError(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#060911" }}>
      <BackgroundCollage />
      <LinearGradient
        colors={["rgba(6,9,17,0.14)", "rgba(6,9,17,0.8)", "rgba(6,9,17,0.97)"]}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <AnimatedSnow density={16} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: SPACING.lg, paddingTop: 72, paddingBottom: 26 }}>
            <View style={{ marginBottom: 28 }}>
              <View style={{ width: 68, height: 68, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
                <Text style={{ fontSize: 28 }}>❄️</Text>
              </View>
              <Text style={{ color: COLORS.white, fontSize: 38, fontWeight: "800", letterSpacing: 0.4 }}>SK Lite</Text>
              <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: FONT.sizes.md, marginTop: 8, lineHeight: 21 }}>
                Jashn Har Din, Party Har Waqt!
              </Text>
            </View>

            <View style={{ borderRadius: 34, padding: 20, backgroundColor: "rgba(8,12,23,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "800", marginBottom: 6 }}>Walk in without the awkward part.</Text>
              <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: FONT.sizes.md, lineHeight: 20, marginBottom: SPACING.lg }}>
                Choose a fast sign-in, grab a guest pass, or verify your phone with OTP.
              </Text>

              <View style={{ gap: 12 }}>
                <SocialButton
                  icon="google"
                  loading={busyAction === "google"}
                  onPress={() => void handleOAuth("oauth_google", "google")}
                  subtitle="Continue with your Google account"
                  title="Google"
                  variant="primary"
                />
                <SocialButton
                  icon="facebook"
                  loading={busyAction === "facebook"}
                  onPress={() => void handleOAuth("oauth_facebook", "facebook")}
                  subtitle="Use your Facebook identity through Clerk"
                  title="Facebook"
                />

                <View style={{ borderRadius: 24, padding: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: phoneStatus === "sent" ? "rgba(108,92,231,0.5)" : "rgba(255,255,255,0.08)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialCommunityIcons color={COLORS.white} name="cellphone-message" size={22} />
                      </View>
                      <View>
                        <Text style={{ color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: "700" }}>Phone</Text>
                        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: FONT.sizes.sm }}>
                          {phoneStatus === "sent" ? `Code sent to ${phoneNumber.trim()}` : "Verify with a one-time SMS code"}
                        </Text>
                      </View>
                    </View>
                    {phoneStatus === "sent" ? (
                      <TouchableOpacity onPress={resetPhoneFlow}>
                        <Text style={{ color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: "600" }}>Edit</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {phoneStatus === "idle" ? (
                    <>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="tel"
                        keyboardType="phone-pad"
                        onChangeText={setPhoneNumber}
                        placeholder="+919876543210"
                        placeholderTextColor="rgba(255,255,255,0.34)"
                        style={{
                          borderRadius: 18,
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          backgroundColor: "rgba(255,255,255,0.08)",
                          color: COLORS.white,
                          fontSize: FONT.sizes.md,
                          marginBottom: 12,
                        }}
                        value={phoneNumber}
                      />
                      <TouchableOpacity
                        activeOpacity={0.9}
                        disabled={busyAction === "phone-send"}
                        onPress={() => void handlePhoneSendCode()}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.12)",
                          borderRadius: 18,
                          paddingVertical: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.12)",
                          opacity: busyAction === "phone-send" ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: "700" }}>
                          {busyAction === "phone-send" ? "Sending code..." : "Send OTP"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => otpInputRef.current?.focus()} style={{ marginBottom: 14 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          {Array.from({ length: 6 }, (_, index) => {
                            const digit = otpCode[index] ?? "";
                            return (
                              <View
                                key={index}
                                style={{
                                  width: 44,
                                  height: 54,
                                  borderRadius: 16,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "rgba(255,255,255,0.08)",
                                  borderWidth: 1,
                                  borderColor: digit ? "rgba(108,92,231,0.7)" : "rgba(255,255,255,0.08)",
                                }}
                              >
                                <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "700" }}>{digit}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </Pressable>
                      <TextInput
                        ref={otpInputRef}
                        keyboardType="number-pad"
                        maxLength={6}
                        onChangeText={(value) => setOtpCode(value.replace(/\D/g, ""))}
                        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                        value={otpCode}
                      />

                      <TouchableOpacity
                        activeOpacity={0.9}
                        disabled={busyAction === "phone-verify"}
                        onPress={() => void handlePhoneVerify()}
                        style={{
                          backgroundColor: COLORS.primary,
                          borderRadius: 18,
                          paddingVertical: 14,
                          alignItems: "center",
                          marginBottom: 10,
                          opacity: busyAction === "phone-verify" ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: "700" }}>
                          {busyAction === "phone-verify" ? "Verifying..." : "Verify OTP"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity disabled={resendIn > 0 || busyAction === "phone-send"} onPress={() => void handlePhoneSendCode()}>
                        <Text style={{ color: resendIn > 0 ? "rgba(255,255,255,0.34)" : COLORS.white, fontSize: FONT.sizes.sm, fontWeight: "600", textAlign: "center" }}>
                          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {error ? (
                <View style={{ marginTop: SPACING.md, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(225,112,85,0.14)", borderWidth: 1, borderColor: "rgba(225,112,85,0.25)" }}>
                  <Text style={{ color: "#FFC5B7", fontSize: FONT.sizes.sm, lineHeight: 18 }}>{error}</Text>
                </View>
              ) : null}

              <AuthDivider label="or explore first" />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.lg }}>
                <SocialButton icon="whatsapp" onPress={() => void openExternalUrl(whatsappSupportNumber ? `https://wa.me/${whatsappSupportNumber.replace(/\D/g, "")}` : undefined, "WhatsApp support number")} title="WhatsApp" variant="icon" />
                <SocialButton icon="twitter" onPress={() => void openExternalUrl(xPageUrl, "X page URL")} title="X" variant="icon" />
                <SocialButton icon="incognito" loading={busyAction === "guest"} onPress={() => void handleGuestAccess()} title="Guest" variant="icon" />
              </View>

              <View style={{ alignItems: "center", gap: 10 }}>
                <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
                  <Text style={{ color: COLORS.white, fontSize: FONT.sizes.sm, fontWeight: "700" }}>Need a full account? Sign up</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                  <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: FONT.sizes.xs }}>By continuing, you agree to our </Text>
                  <TouchableOpacity onPress={() => void openExternalUrl(termsUrl, "Terms URL")}>
                    <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xs, fontWeight: "700" }}>Terms</Text>
                  </TouchableOpacity>
                  <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: FONT.sizes.xs }}> and </Text>
                  <TouchableOpacity onPress={() => void openExternalUrl(privacyUrl, "Privacy URL")}>
                    <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xs, fontWeight: "700" }}>Privacy</Text>
                  </TouchableOpacity>
                  <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: FONT.sizes.xs }}>.</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
