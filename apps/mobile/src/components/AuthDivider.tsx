import React from "react";
import { View, Text } from "react-native";
import { COLORS, FONT, SPACING } from "@/theme";

export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginVertical: SPACING.lg }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.14)" }} />
      <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: FONT.sizes.sm, fontWeight: "500" }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.14)" }} />
    </View>
  );
}