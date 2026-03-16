import React from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, Button, CoinDisplay } from "@/components/ui";
import { useI18n } from "@/i18n";
import { COLORS, SPACING } from "@/theme";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function VipScreen() {
  const { t, isRTL } = useI18n();
  const subscription = trpc.vip.getMySubscription.useQuery(undefined, { retry: false });
  const tiersQuery = trpc.vip.getAvailableTiers.useQuery(undefined, { retry: false });
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

  return (
    <Screen scroll>
      {current?.tier ? (
        <Card style={{ alignItems: "center", backgroundColor: COLORS.primaryLight, marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>
            {t("vip.currentStatus", { tier: currentTierName })}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
            {t("vip.expires", { date: currentExpiry ? new Date(currentExpiry).toLocaleDateString() : t("common.na") })}
          </Text>
          <Button
            title={t("vip.cancelSubscription")}
            onPress={handleCancel}
            variant="secondary"
            loading={cancelMut.isPending}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>
      ) : (
        <Card style={{ alignItems: "center", marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>{t("vip.upgradeTitle")}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4, textAlign: "center" }}>
            {t("vip.upgradeSubtitle")}
          </Text>
        </Card>
      )}

      {tiersQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
      ) : tiers.length === 0 ? (
        <Card>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: "center" }}>
            {t("vip.noTiers")}
          </Text>
        </Card>
      ) : (
        tiers.map((tier: any) => {
          const isCurrentTier = current?.tier === tier.id || current?.tierId === tier.id;
          return (
            <Card
              key={tier.id}
              style={{
                borderWidth: isCurrentTier ? 2 : 0,
                borderColor: COLORS.primary,
              }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>{tier.name}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {tier.duration ?? t("vip.durationFallback")}
                  </Text>
                </View>
                <CoinDisplay amount={tier.price ?? tier.priceCoins ?? 0} />
              </View>

              <View style={{ gap: 6, marginBottom: SPACING.md }}>
                {(tier.perks ?? tier.benefits ?? []).map((perk: string) => (
                  <View key={perk} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14, color: COLORS.success }}>+</Text>
                    <Text style={{ fontSize: 14, color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>{perk}</Text>
                  </View>
                ))}
              </View>

              <Button
                title={isCurrentTier ? t("vip.currentPlan") : t("vip.subscribe")}
                onPress={() => handleSubscribe(tier.id, tier.name)}
                variant={isCurrentTier ? "secondary" : "primary"}
                disabled={isCurrentTier}
                loading={subscribeMut.isPending}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
