import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from "react-native";
import { Screen, Card, CoinDisplay, EmptyState, Button, SectionHeader, Badge } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useUIStore, useWalletStore } from "@/store";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

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
  const catalog = trpc.gift.getActiveCatalog.useQuery(undefined, { retry: false });
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

  return (
    <Screen scroll>
      {giftFlag.data?.enabled === false && (
        <Card>
          <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 16 }}>Gift sending is disabled</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>This feature is currently turned off for the active mobile app version.</Text>
        </Card>
      )}

      {giftTarget && (
        <View style={{ backgroundColor: COLORS.primaryLight, padding: SPACING.sm, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.sm }}>
          <Text style={{ fontSize: 13, color: COLORS.primaryDark, textAlign: "center" }}>
            Sending to user in {getGiftContextLabel(giftTarget.context)}
          </Text>
        </View>
      )}

      <SectionHeader title="Gift Economy" />
      <Card>
        {creatorEconomy.isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : creatorEconomy.data ? (
          <>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Platform commission: {creatorEconomy.data.commission.platformCommissionPercent}%
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Creator share: {creatorEconomy.data.commission.creatorSharePercent}% of gift value
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>
              Baseline conversion: {creatorEconomy.data.diamondConversion.coins} coins to {creatorEconomy.data.diamondConversion.diamonds} diamonds
            </Text>
          </>
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>Gift conversion policy is unavailable right now.</Text>
        )}
      </Card>

      {Object.entries(grouped).map(([tier, gifts]) => (
        <View key={tier} style={{ marginBottom: SPACING.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: TIER_COLORS[tier] ?? COLORS.text }}>
              {tier}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>({gifts.length})</Text>
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
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{selectedGift.displayName}</Text>
            <Badge text={selectedGift.effectTier ?? "STANDARD"} color={TIER_COLORS[selectedGift.effectTier ?? "STANDARD"] ?? COLORS.primary} />
          </View>
          <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
            Cost: {selectedGift.coinPrice ?? 0} coins
          </Text>
          <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.md }}>
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
    </Screen>
  );
}
