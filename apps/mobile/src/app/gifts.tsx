import React, { useState } from "react";
import { router } from "expo-router";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { Badge, Button, Card, CoinDisplay, EmptyState, Screen, SectionHeader } from "@/components/ui";
import { getMobileRuntimeScope } from "@/lib/runtime-config";
import { trpc } from "@/lib/trpc";
import { useAuthStore, useUIStore, useWalletStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";

type Gift = {
  id?: string;
  displayName?: string;
  coinPrice?: number;
  diamondCredit?: number;
  effectTier?: string;
  catalogKey?: string;
};

const TIER_COLORS: Record<string, string> = {
  MICRO: COLORS.textSecondary,
  STANDARD: COLORS.primary,
  PREMIUM: COLORS.gold,
  LEGENDARY: COLORS.accent,
};

const TIER_ICONS: Record<string, string> = {
  MICRO: "🌸",
  STANDARD: "💝",
  PREMIUM: "👑",
  LEGENDARY: "🏰",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getGiftContextLabel(context?: string | null) {
  switch (context) {
    case "PK_BATTLE":
      return "PK battle";
    case "LIVE_STREAM":
      return "live stream";
    case "VIDEO_CALL":
      return "video call";
    case "VOICE_CALL":
      return "voice call";
    default:
      return context ? String(context).toLowerCase().replaceAll("_", " ") : "selected experience";
  }
}

export default function GiftsScreen() {
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const catalog = trpc.gift.getActiveCatalog.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
  const giftFlag = trpc.config.evaluateFeatureFlag.useQuery({ key: "gift_sending", ...getMobileRuntimeScope() }, { retry: false });
  const sendGift = trpc.gift.sendGift.useMutation();
  const giftTarget = useUIStore((s) => s.selectedGiftTarget);
  const closeDrawer = useUIStore((s) => s.closeGiftDrawer);
  const coins = useWalletStore((s) => s.coinBalance);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);

  const items = (catalog.data?.items ?? catalog.data ?? []) as Gift[];

  const grouped = items.reduce((acc, gift) => {
    const tier = gift.effectTier ?? "STANDARD";
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(gift);
    return acc;
  }, {} as Record<string, Gift[]>);

  const estimateDiamondCredit = (gift: Gift) => {
    const policy = creatorEconomy.data;
    if (!policy) return gift.diamondCredit ?? 0;
    if ((gift.diamondCredit ?? 0) > 0) return gift.diamondCredit ?? 0;
    return Math.max(
      0,
      Math.round(
        (gift.coinPrice ?? 0)
        * (policy.diamondConversion.diamonds / Math.max(1, policy.diamondConversion.coins))
        * (1 - policy.commission.platformCommissionPercent / 100),
      ),
    );
  };

  const handleSendGift = (gift: Gift) => {
    if (!giftTarget) {
      Alert.alert("No Target", "Open the gift panel from a stream, call, or profile to send gifts.");
      return;
    }
    if ((gift.coinPrice ?? 0) > coins) {
      Alert.alert("Insufficient Coins", "You don't have enough coins. Buy more from the wallet.");
      return;
    }
    Alert.alert("Send Gift", `Send ${gift.displayName} for ${gift.coinPrice} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () => {
          sendGift.mutate({
            giftId: gift.id ?? gift.catalogKey ?? "",
            receiverUserId: giftTarget.userId,
            contextType: giftTarget.context as any,
            contextId: giftTarget.roomId ?? "",
            idempotencyKey: `gift-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }, {
            onSuccess: () => {
              Alert.alert("Gift Sent!", `${gift.displayName} sent successfully!`);
              catalog.refetch();
            },
            onError: (error: unknown) => Alert.alert("Error", getErrorMessage(error, "Unable to send gift.")),
          });
        },
      },
    ]);
  };

  const renderGift = ({ item }: { item: Gift }) => {
    const tier = item.effectTier ?? "STANDARD";
    return (
      <TouchableOpacity
        onPress={() => setSelectedGift(item)}
        style={{
          width: "30%",
          backgroundColor: COLORS.card,
          borderRadius: RADIUS.lg,
          padding: SPACING.sm,
          alignItems: "center",
          borderWidth: 1,
          borderColor: selectedGift?.id === item.id ? TIER_COLORS[tier] ?? COLORS.border : COLORS.border,
          marginBottom: SPACING.sm,
        }}
      >
        <Text style={{ fontSize: 32 }}>{TIER_ICONS[tier] ?? "🎁"}</Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.text, marginTop: 4, textAlign: "center" }} numberOfLines={1}>
          {item.displayName ?? "Gift"}
        </Text>
        <CoinDisplay amount={item.coinPrice ?? 0} size="sm" />
      </TouchableOpacity>
    );
  };

  const selectedGiftDiamondCredit = selectedGift ? estimateDiamondCredit(selectedGift) : 0;

  if (!isAuthenticated) {
    return (
      <Screen scroll style={{ backgroundColor: "#0C1345" }}>
        <View style={{ padding: SPACING.md }}>
          <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "800" }}>Sign in to send gifts</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
              Gifting affects wallet balances and creator payouts, so the live catalog is only available for authenticated accounts.
            </Text>
            <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={{ backgroundColor: "#0C1345" }}>
      <View style={{ padding: SPACING.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
          <View>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900" }}>Gift Shop</Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>Fast gifting for live rooms, PK battles, and premium calls.</Text>
          </View>
          {giftTarget ? (
            <TouchableOpacity onPress={closeDrawer} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: COLORS.white, fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

      {giftFlag.data?.enabled === false && (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 16 }}>Gift sending is disabled</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8 }}>This feature is currently turned off for the active mobile app version.</Text>
        </Card>
      )}

      {giftTarget && (
        <View style={{ backgroundColor: "rgba(103,231,255,0.12)", padding: SPACING.sm, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: "rgba(103,231,255,0.18)" }}>
          <Text style={{ fontSize: 13, color: "#9CF3FF", textAlign: "center" }}>
            Sending to user in {getGiftContextLabel(giftTarget.context)}
          </Text>
        </View>
      )}

      <SectionHeader title="Gift Economy" />
      <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        {creatorEconomy.data ? (
          <>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
              Platform commission: {creatorEconomy.data.commission.platformCommissionPercent}%
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
              Creator share: {creatorEconomy.data.commission.creatorSharePercent}% of gift value
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)" }}>
              Baseline conversion: {creatorEconomy.data.diamondConversion.coins} coins to {creatorEconomy.data.diamondConversion.diamonds} diamonds
            </Text>
          </>
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.72)" }}>Gift conversion policy is unavailable right now.</Text>
        )}
      </Card>

      {Object.entries(grouped).map(([tier, gifts]) => (
        <View key={tier} style={{ marginBottom: SPACING.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: TIER_COLORS[tier] ?? COLORS.text }}>
              {tier}
            </Text>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.58)" }}>({gifts.length})</Text>
          </View>
          <FlatList
            data={gifts}
            keyExtractor={(item, idx) => item.id ?? item.catalogKey ?? `gift-${idx}`}
            renderItem={renderGift}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.md }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
          />
        </View>
      ))}

      {selectedGift && giftFlag.data?.enabled !== false && (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.white }}>{selectedGift.displayName}</Text>
            <Badge text={selectedGift.effectTier ?? "STANDARD"} color={TIER_COLORS[selectedGift.effectTier ?? "STANDARD"] ?? COLORS.primary} />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
            Cost: {selectedGift.coinPrice ?? 0} coins
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.md }}>
            Estimated creator credit: {selectedGiftDiamondCredit} diamonds
          </Text>
          <Button
            title={giftTarget ? "Send Selected Gift" : "Select a target to send"}
            onPress={() => handleSendGift(selectedGift)}
            disabled={!giftTarget || (selectedGift.coinPrice ?? 0) > coins || sendGift.isPending}
            loading={sendGift.isPending}
          />
        </Card>
      )}

      {items.length === 0 && (
        <EmptyState icon="🎁" title="No Gifts Available" subtitle="Gift catalog is loaded from backend configuration." />
      )}
      </View>
    </Screen>
  );
}
