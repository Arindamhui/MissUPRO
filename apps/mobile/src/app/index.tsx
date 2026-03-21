import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "@/store";
import { COLORS } from "@/theme";

export default function IndexScreen() {
  const authMode = useAuthStore((s) => s.authMode);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authMode === "authenticated" || authMode === "guest") {
        router.replace("/(tabs)");
        return;
      }

      router.replace("/(auth)/login");
    }, isHydrated ? 250 : 1600);

    return () => clearTimeout(timeout);
  }, [authMode, isHydrated]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>
        Preparing MissU Pro...
      </Text>
    </View>
  );
}