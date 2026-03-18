import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Badge, Button, Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

export default function EffectsScreen() {
  const insets = useSafeAreaInsets();
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false });
  const themes = trpc.party.listOwnedThemes.useQuery(undefined, { retry: false });

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
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>Effect</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Profile effect unlocks</Text>
          <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 6, lineHeight: 22 }}>Your active badge, visual effects, and ranking perks come from the level system and any owned room themes.</Text>
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {((level.data as any)?.visualEffects ?? []).length ? ((level.data as any)?.visualEffects ?? []).map((effect: any) => (
              <Badge key={String(effect.id)} text={String(effect.rewardName ?? effect.rewardType)} color="#7FD7FF" />
            )) : <Badge text="No visual effects unlocked yet" color="#8FA4C9" />}
          </View>
        </Card>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Owned room skins</Text>
          <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 6 }}>{(themes.data ?? []).length} themes ready for party and room customization.</Text>
          <Button title="Open Skin Store" onPress={() => router.push("/(tabs)/live" as never)} style={{ marginTop: 16 }} />
        </Card>
      </ScrollView>
    </View>
  );
}