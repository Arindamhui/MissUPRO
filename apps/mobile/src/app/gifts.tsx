import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { Screen, Card, CoinDisplay, EmptyState, Button } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useUIStore, useWalletStore } from "@/store";

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

export default function GiftsScreen() {
  const catalog = trpc.gift.getActiveCatalog.useQuery(undefined, { retry: false });
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
        onPress={() => handleSendGift(item)}
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

  return (
    <Screen scroll>
      {giftTarget && (
        <View style={{ backgroundColor: COLORS.primaryLight, padding: SPACING.sm, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.sm }}>
          <Text style={{ fontSize: 13, color: COLORS.primaryDark, textAlign: "center" }}>
            Sending to user in {giftTarget.context}
          </Text>
        </View>
      )}

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

      {items.length === 0 && (
        <EmptyState icon="🎁" title="No Gifts Available" subtitle="Gift catalog is loaded from backend configuration." />
      )}
    </Screen>
  );
}
