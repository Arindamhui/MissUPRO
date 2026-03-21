import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING } from "@/theme";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

export default function LinkedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const fallbackEmail = useAuthStore((state) => state.email);
  const me = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: authMode === "authenticated" });
  const email = String(me.data?.email ?? fallbackEmail ?? "No email linked");
  const provider = String(me.data?.authProvider ?? "UNKNOWN");
  const linkedProvider = provider === "UNKNOWN" ? "Email or app-managed login" : provider;

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={8} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>Linked Accounts</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Row label="Primary email" value={email} />
          <Row label="Primary provider" value={linkedProvider} />
          <View style={{ paddingTop: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, marginBottom: 10 }}>Connected providers</Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", lineHeight: 22 }}>
              Mobile accounts currently use a single MissU session. Google sign-in will appear here as GOOGLE after the backend profile sync runs.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}