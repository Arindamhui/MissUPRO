import React, { useState } from "react";
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Screen, Button, Input } from "@/components/ui";
import { COLORS, SPACING, FONT, RADIUS } from "@/theme";
import { useAuthStore } from "@/store";
import { router } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Clerk authentication will be integrated here
      // For now, placeholder
      setAuth("demo-user-id", "demo-token");
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ justifyContent: "center", padding: SPACING.lg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ alignItems: "center", marginBottom: SPACING.xxl }}>
          <Text style={{ fontSize: FONT.sizes.hero, fontWeight: "700", color: COLORS.primary }}>MissU</Text>
          <Text style={{ fontSize: FONT.sizes.xl, fontWeight: "600", color: COLORS.text }}>PRO</Text>
          <Text style={{ fontSize: FONT.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.sm }}>
            Connect with amazing people
          </Text>
        </View>

        <Input label="Email" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secure />

        <Button title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: SPACING.md }} />

        <TouchableOpacity style={{ alignItems: "center", marginTop: SPACING.lg }}>
          <Text style={{ color: COLORS.primary, fontSize: FONT.sizes.md }}>Don't have an account? <Text style={{ fontWeight: "600" }}>Sign Up</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: "center", marginTop: SPACING.md }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.sm }}>Forgot Password?</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}
