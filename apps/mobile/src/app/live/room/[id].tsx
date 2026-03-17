import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/theme";

export default function LiveRoomRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (!id) {
      router.replace("/(tabs)" as never);
      return;
    }

    router.replace(`/stream/${id}` as never);
  }, [id]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}