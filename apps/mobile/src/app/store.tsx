import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Badge } from "@/components/ui";
import { GlassPanel, HeaderTabs, SegmentedPill, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

type ThemeRecord = {
  id: string;
  themeName?: string | null;
  description?: string | null;
  coinPrice?: number | null;
  isPremium?: boolean | null;
  seasonTag?: string | null;
};

export default function StoreScreen() {
  const [tab, setTab] = useState("garage");
  const [segment, setSegment] = useState("purchasable");
  const themes = trpc.party.listAvailableThemes.useQuery(undefined, { retry: false });
  const ownedThemes = trpc.party.listOwnedThemes.useQuery(undefined, { retry: false });
  const luckyOffers = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const purchaseTheme = trpc.party.purchaseTheme.useMutation({
    onSuccess: (result: any) => {
      void ownedThemes.refetch();
      void wallet.refetch();
      Alert.alert(result?.alreadyOwned ? "Already unlocked" : "Theme unlocked", result?.alreadyOwned ? "This theme is already in your bag." : "The theme is now available in your bag and room effects.");
    },
    onError: (error: unknown) => Alert.alert("Unable to unlock theme", error instanceof Error ? error.message : "Please try again."),
  });

  const ownedIds = new Set(((ownedThemes.data ?? []) as any[]).map((item) => String(item.themeId ?? "")).filter(Boolean));
  const themeList = useMemo(() => (themes.data ?? []) as ThemeRecord[], [themes.data]);
  const garageItems = themeList.filter((theme) => segment === "special" ? Boolean(theme.isPremium || theme.seasonTag) : !theme.isPremium || !theme.seasonTag);
  const luckyItems = useMemo(() => (((luckyOffers.data ?? []) as any[]).map((item, index) => ({
    id: String(item.id ?? index),
    title: `Lucky ID# ${Number(item.coins ?? item.amount ?? 0)}`,
    subtitle: `${String(item.priceDisplay ?? item.price ?? "Special")}`,
  }))), [luckyOffers.data]);

  return (
    <WinterScreen title="SK Lite" rightLabel="Close" onRightPress={() => router.back()}>
      <HeaderTabs items={[{ key: "garage", label: "Garage" }, { key: "lucky", label: "Lucky ID#" }]} activeKey={tab} onChange={setTab} />
      <SegmentedPill items={tab === "garage" ? [{ key: "purchasable", label: "Purchasable" }, { key: "special", label: "Special" }] : [{ key: "purchasable", label: "Lucky IDs" }, { key: "special", label: "Premium IDs" }]} activeKey={segment} onChange={setSegment} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {tab === "garage" ? garageItems.map((theme) => {
          const owned = ownedIds.has(String(theme.id));
          const coinPrice = Number(theme.coinPrice ?? 0);
          return (
            <GlassPanel key={String(theme.id)} style={{ width: "48%", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(255,255,255,0.12)", minHeight: 224 }}>
              <View style={{ height: 98, borderRadius: 16, backgroundColor: "#F7F7FB", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 44 }}>🚗</Text>
              </View>
              <Text style={{ color: "#232027", fontSize: 16, fontWeight: "800", textAlign: "center" }}>{String(theme.themeName ?? "Garage item")}</Text>
              <Text style={{ color: "#F03A97", fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 8 }}>{coinPrice.toLocaleString()} beans/week</Text>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {theme.isPremium ? <Badge text="Premium" color="#FF89D9" /> : null}
                {theme.seasonTag ? <Badge text={String(theme.seasonTag)} color="#9FD4FF" /> : null}
              </View>
              <TouchableOpacity onPress={() => owned ? router.push("/bag" as never) : purchaseTheme.mutate({ themeId: String(theme.id) })} style={{ marginTop: 14, alignSelf: "center", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: owned ? "#EFEFF5" : "#F03A97" }}>
                <Text style={{ color: owned ? "#5E5B66" : COLORS.white, fontWeight: "800" }}>{owned ? "Owned" : "Unlock"}</Text>
              </TouchableOpacity>
            </GlassPanel>
          );
        }) : luckyItems.filter((_, index) => segment === "special" ? index % 2 === 0 : true).map((item) => (
          <GlassPanel key={item.id} style={{ width: "48%", backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(255,255,255,0.12)", minHeight: 224 }}>
            <View style={{ height: 98, borderRadius: 16, backgroundColor: "#F7F7FB", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MaterialCommunityIcons color="#FF3EAB" name="pound-box-outline" size={54} />
            </View>
            <Text style={{ color: "#232027", fontSize: 16, fontWeight: "800", textAlign: "center" }}>{item.title}</Text>
            <Text style={{ color: "#F03A97", fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 8 }}>{item.subtitle}</Text>
            <TouchableOpacity onPress={() => Alert.alert("Lucky ID", "Lucky ID purchase is controlled from the wallet pricing catalog.")} style={{ marginTop: 16, alignSelf: "center", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#F03A97" }}>
              <Text style={{ color: COLORS.white, fontWeight: "800" }}>Claim</Text>
            </TouchableOpacity>
          </GlassPanel>
        ))}
      </View>
    </WinterScreen>
  );
}