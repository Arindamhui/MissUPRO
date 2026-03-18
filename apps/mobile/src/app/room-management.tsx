import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { GlassPanel, WinterScreen } from "@/components/me-winter";
import { COLORS } from "@/theme";

function Row({ label, route }: { label: string; route: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ color: COLORS.white, fontSize: 18, flex: 1 }}>{label}</Text>
      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 28 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function RoomManagementScreen() {
  return (
    <WinterScreen title="Room Mgmt">
      <GlassPanel>
        <Row label="Room Admin" route="/agency/dashboard" />
        <Row label="Room Blacklist" route="/room-blacklist" />
      </GlassPanel>
    </WinterScreen>
  );
}