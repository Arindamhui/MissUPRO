import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Badge, Button, Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const packagesQuery = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const vipTiers = trpc.vip.getAvailableTiers.useQuery(undefined, { retry: false });
  const themes = trpc.party.listAvailableThemes.useQuery(undefined, { retry: false });

  const packages = (packagesQuery.data ?? []) as any[];
  const tiers = (vipTiers.data ?? []) as any[];
  const activeThemes = ((themes.data ?? []) as any[]).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={8} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 32, fontWeight: "900" }}>My Market</Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 4 }}>Purchase hubs driven by backend pricing and admin-published catalog items.</Text>
          </View>
        </View>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Coin packages</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {packages.slice(0, 6).map((pkg) => (
              <View key={String(pkg.id)} style={{ width: "31%", padding: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{Number(pkg.coins ?? pkg.amount ?? 0).toLocaleString()}</Text>
                <Text style={{ color: "#9FD4FF", marginTop: 4 }}>{String(pkg.priceDisplay ?? pkg.price ?? "-")}</Text>
              </View>
            ))}
          </View>
          <Button title="Open Wallet Purchase" onPress={() => router.push("/wallet/purchase")} style={{ marginTop: 16 }} />
        </Card>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>VIP tiers</Text>
          {tiers.slice(0, 3).map((tier) => (
            <View key={String(tier.id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "700" }}>{String(tier.name)}</Text>
                <Badge text={`${Number(tier.priceCoins ?? tier.price ?? 0)} coins`} color="#FFD37A" />
              </View>
              <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 6 }}>{String(tier.duration ?? "30 days")}</Text>
            </View>
          ))}
          <Button title="Open VIP Center" onPress={() => router.push("/vip")} style={{ marginTop: 16 }} />
        </Card>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Featured room skins</Text>
          {activeThemes.map((theme) => (
            <View key={String(theme.id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "700" }}>{String(theme.themeName ?? "Theme")}</Text>
                <Badge text={Number(theme.coinPrice ?? 0) > 0 ? `${Number(theme.coinPrice)} coins` : "Free"} color={Number(theme.coinPrice ?? 0) > 0 ? "#FFD37A" : "#75E5AF"} />
              </View>
              <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 6 }}>{String(theme.description ?? "Published from the party theme catalog")}</Text>
            </View>
          ))}
          <Button title="Open Theme Store" onPress={() => router.push("/store")} style={{ marginTop: 16 }} />
        </Card>
      </ScrollView>
    </View>
  );
}