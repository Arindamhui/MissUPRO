import React from "react";
import { View, Text, Share, Alert } from "react-native";
import { Screen, Card, SectionHeader, Button, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING, RADIUS } from "@/theme";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ReferralsScreen() {
  const { t, isRTL } = useI18n();
  const generateCode = trpc.referral.generateInviteCode.useMutation();
  const progress = trpc.referral.getReferralProgress.useQuery(undefined, { retry: false });

  const data = (progress.data ?? {}) as {
    referralCode?: string;
    totalInvited?: number;
    totalQualified?: number;
    totalRewarded?: number;
    rewards?: Array<{ rewardType?: string; rewardValueJson?: unknown; status?: string }>;
  };

  const handleGenerateCode = () => {
    generateCode.mutate(undefined, {
      onSuccess: () => progress.refetch(),
      onError: (error: unknown) => Alert.alert(t("common.error"), getErrorMessage(error, t("referrals.generateFailed"))),
    });
  };

  const handleShare = async () => {
    if (!data.referralCode) return;
    try {
      await Share.share({
        message: t("referrals.shareMessage", { code: data.referralCode }),
      });
    } catch (error) {
      Alert.alert(t("common.error"), getErrorMessage(error, t("system.shareFailed")));
    }
  };

  return (
    <Screen scroll>
      <Card style={{ alignItems: "center", marginBottom: SPACING.md }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.textSecondary, marginBottom: SPACING.sm, textAlign: isRTL ? "right" : "left" }}>
          {t("referrals.inviteCodeTitle")}
        </Text>
        {data.referralCode ? (
          <>
            <View
              style={{
                backgroundColor: COLORS.primaryLight,
                paddingHorizontal: SPACING.xl,
                paddingVertical: SPACING.md,
                borderRadius: RADIUS.lg,
                marginBottom: SPACING.md,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.primary, letterSpacing: 4 }}>
                {data.referralCode}
              </Text>
            </View>
            <Button title={t("referrals.shareInvite")} variant="primary" onPress={handleShare} />
          </>
        ) : (
          <Button
            title={t("referrals.generateInviteCode")}
            variant="primary"
            onPress={handleGenerateCode}
            loading={generateCode.isPending}
          />
        )}
      </Card>

      <SectionHeader title={t("referrals.statsTitle")} />
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text }}>{data.totalInvited ?? 0}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{t("referrals.invited")}</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.success }}>{data.totalQualified ?? 0}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{t("referrals.qualified")}</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.gold }}>{data.totalRewarded ?? 0}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{t("referrals.rewarded")}</Text>
        </Card>
      </View>

      <SectionHeader title={t("referrals.rewardsEarned")} />
      {(data.rewards ?? []).length === 0 ? (
        <EmptyState icon="*" title={t("referrals.noRewardsTitle")} subtitle={t("referrals.noRewardsSubtitle")} />
      ) : (
        (data.rewards ?? []).map((reward, index) => (
          <Card key={index} style={{ marginBottom: SPACING.xs }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>
              {reward.rewardType}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: isRTL ? "right" : "left" }}>
              {t("referrals.status", { status: String(reward.status ?? "-") })}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
