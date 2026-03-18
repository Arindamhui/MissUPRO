import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "@/store";
import { COLORS } from "@/theme";

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const authMode = useAuthStore((s) => s.authMode);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isSignedIn || authMode === "guest") {
        router.replace("/(tabs)");
        return;
      }

      router.replace("/(auth)/login");
    }, isLoaded ? 250 : 1600);

    return () => clearTimeout(timeout);
  }, [authMode, isLoaded, isSignedIn]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>
        Preparing MissU Pro...
      </Text>
    </View>
  );
}