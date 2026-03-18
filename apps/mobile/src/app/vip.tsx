import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import { COLORS, SPACING } from "@/theme";
import { useAuthStore } from "@/store";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function VipScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const subscription = trpc.vip.getMySubscription.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const tiersQuery = trpc.vip.getAvailableTiers.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const subscribeMut = trpc.vip.subscribe.useMutation({
    onSuccess: () => {
      subscription.refetch();
      Alert.alert(t("vip.activatedTitle"), t("vip.activatedBody"));
    },
    onError: (error: unknown) => Alert.alert(t("common.error"), getErrorMessage(error, t("vip.activateFailed"))),
  });
  const cancelMut = trpc.vip.cancelSubscription.useMutation({
    onSuccess: () => {
      subscription.refetch();
      Alert.alert(t("vip.cancelledTitle"), t("vip.cancelledBody"));
    },
    onError: (error: unknown) => Alert.alert(t("common.error"), getErrorMessage(error, t("vip.cancelFailed"))),
  });

  const current = subscription.data as any;
  const tiers = (tiersQuery.data as any[]) ?? [];
  const currentTierName = current?.tierDetails?.name ?? current?.tier ?? "VIP";
  const currentExpiry = current?.currentPeriodEnd ?? current?.expiresAt;
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTierId) {
      setSelectedTierId(String(current?.tierId ?? tiers[0]?.id ?? ""));
    }
  }, [current?.tierId, selectedTierId, tiers]);

  const selectedTier = useMemo(() => tiers.find((tier) => String(tier.id) === selectedTierId) ?? tiers[0] ?? null, [selectedTierId, tiers]);

  const handleSubscribe = (tierId: string, tierName: string) => {
    Alert.alert(t("vip.subscribePromptTitle"), t("vip.subscribePromptBody", { tier: tierName }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("vip.subscribe"), onPress: () => subscribeMut.mutate({ tierId }) },
    ]);
  };

  const handleCancel = () => {
    Alert.alert(t("vip.cancelPromptTitle"), t("vip.cancelPromptBody"), [
      { text: t("vip.keepVip"), style: "cancel" },
      { text: t("vip.cancelVip"), style: "destructive", onPress: () => cancelMut.mutate() },
    ]);
  };

  const palette = useMemo(() => {
    const name = String(selectedTier?.name ?? currentTierName ?? "VIP").toUpperCase();
    if (name.includes("VVIP")) {
      return { start: "#FFE08A", end: "#F5A623", text: "#3B2200", chip: "rgba(59,34,0,0.12)" };
    }
    if (name.includes("SVIP")) {
      return { start: "#C6D8FF", end: "#7CA7FF", text: "#102449", chip: "rgba(16,36,73,0.12)" };
    }
    return { start: "#FFD2E4", end: "#FF8FB4", text: "#4C1731", chip: "rgba(76,23,49,0.12)" };
  }, [currentTierName, selectedTier?.name]);

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0C1345", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", textAlign: "center" }}>Sign in to open VIP Center</Text>
        <Text style={{ color: "rgba(255,255,255,0.68)", textAlign: "center", marginTop: 12 }}>VIP membership and subscription management require an authenticated account.</Text>
        <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0D1C" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(12,14,28,0.52)", "rgba(9,12,25,0.9)", "rgba(6,8,18,0.98)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={6} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me" as never))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={26} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>VIP Center</Text>
            <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>Membership tiers stay synced to live backend pricing and subscription state.</Text>
          </View>
        </View>

        <LinearGradient colors={[palette.start, palette.end]} style={{ borderRadius: 32, padding: 22, marginBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: palette.text, fontSize: 13, fontWeight: "900" }}>{current?.tier ? "ACTIVE MEMBERSHIP" : "SELECT MEMBERSHIP"}</Text>
              <Text style={{ color: palette.text, fontSize: 30, fontWeight: "900", marginTop: 8 }}>{String(selectedTier?.name ?? currentTierName)}</Text>
              <Text style={{ color: palette.text, opacity: 0.78, marginTop: 6, lineHeight: 20 }}>
                {current?.tier
                  ? t("vip.expires", { date: currentExpiry ? new Date(currentExpiry).toLocaleDateString() : t("common.na") })
                  : t("vip.upgradeSubtitle")}
              </Text>
            </View>
            <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={palette.text} name="crown" size={44} />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <View style={{ flex: 1, borderRadius: 18, padding: 14, backgroundColor: palette.chip }}>
              <Text style={{ color: palette.text, opacity: 0.74, fontSize: 12, fontWeight: "700" }}>Price</Text>
              <Text style={{ color: palette.text, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{Number(selectedTier?.priceCoins ?? selectedTier?.price ?? 0).toLocaleString()}</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 18, padding: 14, backgroundColor: palette.chip }}>
              <Text style={{ color: palette.text, opacity: 0.74, fontSize: 12, fontWeight: "700" }}>Duration</Text>
              <Text style={{ color: palette.text, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{String(selectedTier?.duration ?? "30d")}</Text>
            </View>
          </View>
        </LinearGradient>

        {tiersQuery.isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.lg }} />
        ) : tiers.length === 0 ? (
          <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20 }}>
            <Text style={{ color: "rgba(255,255,255,0.62)", textAlign: "center" }}>{t("vip.noTiers")}</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, marginBottom: 18 }}>
              {tiers.map((tier: any) => {
                const active = String(tier.id) === String(selectedTier?.id);
                return (
                  <TouchableOpacity key={String(tier.id)} onPress={() => setSelectedTierId(String(tier.id))} style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, backgroundColor: active ? "#FFD666" : "rgba(255,255,255,0.08)", borderWidth: active ? 0 : 1, borderColor: "rgba(255,255,255,0.08)" }}>
                    <Text style={{ color: active ? "#2E1500" : COLORS.white, fontWeight: "900" }}>{String(tier.name)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20, marginBottom: 18 }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginBottom: 14 }}>{String(selectedTier?.name ?? "VIP")}</Text>
              <View style={{ gap: 10, marginBottom: 18 }}>
                {((selectedTier?.perks ?? selectedTier?.benefits ?? []) as string[]).map((perk, index) => (
                  <View key={`${perk}-${index}`} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,214,102,0.12)", alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons color="#FFD666" name="check" size={18} />
                    </View>
                    <Text style={{ color: COLORS.white, flex: 1, textAlign: isRTL ? "right" : "left" }}>{perk}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
                <View style={{ flex: 1, borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>Tier coins</Text>
                  <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginTop: 6 }}>{Number(selectedTier?.priceCoins ?? selectedTier?.price ?? 0).toLocaleString()}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.06)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>Member status</Text>
                  <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginTop: 6 }}>{current?.tier ? "Active" : "Inactive"}</Text>
                </View>
              </View>

              <Button
                title={current?.tierId === selectedTier?.id || current?.tier === selectedTier?.id ? t("vip.currentPlan") : t("vip.subscribe")}
                onPress={() => handleSubscribe(String(selectedTier?.id), String(selectedTier?.name ?? "VIP"))}
                disabled={!selectedTier || current?.tierId === selectedTier?.id || current?.tier === selectedTier?.id}
                loading={subscribeMut.isPending}
              />

              {current?.tier ? (
                <Button
                  title={t("vip.cancelSubscription")}
                  onPress={handleCancel}
                  variant="secondary"
                  loading={cancelMut.isPending}
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </View>

            <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20 }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginBottom: 12 }}>VIP privileges</Text>
              <Text style={{ color: "rgba(255,255,255,0.62)", lineHeight: 20 }}>
                Tier data, pricing, and active subscription state come from the backend. This screen now presents those contracts in a dedicated VIP-center layout instead of the previous generic card list.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
