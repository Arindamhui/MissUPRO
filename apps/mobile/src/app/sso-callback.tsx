import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/theme";

export default function SSOCallbackScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 600);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
