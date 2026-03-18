import React, { useMemo, useState } from "react";
import { View, Text, Share, Alert } from "react-native";
import { Stack } from "expo-router";
import { GradientButton, GlassPanel, HeaderTabs, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ReferralsScreen() {
  const [tab, setTab] = useState("invite");
  const progress = trpc.referral.getReferralProgress.useQuery(undefined, { retry: false });

  const data = (progress.data ?? {}) as {
    referralCode?: string;
    totalInvited?: number;
    totalQualified?: number;
    totalRewarded?: number;
    referrals?: Array<{ inviteeUserId?: string; inviteeDisplayName?: string; status?: string }>;
    rewards?: Array<{ rewardType?: string; rewardValueJson?: unknown; status?: string }>;
  };

  const handleShare = async () => {
    if (!data.referralCode) {
      return;
    }
    try {
      await Share.share({
        message: `Join me on MissUPro with invite code ${data.referralCode}.`,
      });
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error, "Unable to share right now."));
    }
  };

  const invitees = useMemo(() => (data.referrals ?? []) as Array<{ inviteeUserId?: string; inviteeDisplayName?: string; status?: string }>, [data.referrals]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WinterScreen title="MissUPro" rightLabel="Close" onRightPress={() => undefined}>
      <HeaderTabs items={[{ key: "invite", label: "Invite a Friend" }, { key: "invitees", label: "My Invitees" }]} activeKey={tab} onChange={setTab} />

      {tab === "invite" ? (
        <>
          <GlassPanel style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.12)" }}>
            <View style={{ backgroundColor: "#FF1494", borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 }}>
              <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900", textAlign: "center" }}>Invite your Friends!</Text>
              <Text style={{ color: COLORS.white, fontSize: 18, textAlign: "center", marginTop: 8 }}>WIN upto 5000 BEANS per invite!</Text>
            </View>

            <Text style={{ color: "#FF1494", fontSize: 20, fontWeight: "800", marginTop: 20 }}>My Collected Bonus: <Text style={{ color: "#999" }}>{Number(data.totalRewarded ?? 0)} beans</Text></Text>
            <View style={{ backgroundColor: "#7B17FF", borderRadius: 999, paddingVertical: 14, marginTop: 18 }}>
              <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800", textAlign: "center" }}>New Comers will get ✨</Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 28 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 78 }}>🐧</Text>
                <Text style={{ color: "#FF1494", fontSize: 16, fontWeight: "800", marginTop: 8 }}>Newbee gift</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 78 }}>👑</Text>
                <Text style={{ color: "#FF1494", fontSize: 16, fontWeight: "800", marginTop: 8 }}>3 days VIP</Text>
              </View>
            </View>

            <Text style={{ color: "#999", fontSize: 15, textAlign: "center", marginTop: 24 }}>Invite code: {String(data.referralCode ?? "Generating...")}</Text>
            <View style={{ marginTop: 22 }}>
              <GradientButton title="Invite" onPress={handleShare} />
            </View>
          </GlassPanel>
        </>
      ) : (
        <GlassPanel style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.12)" }}>
          <Text style={{ color: "#FF1494", fontSize: 18, fontWeight: "800", marginBottom: 16 }}>List of Invitees</Text>
          <View style={{ borderWidth: 1, borderColor: "#EAE7F0", minHeight: 110, borderRadius: 8, alignItems: "center", justifyContent: "center", padding: 16 }}>
            {invitees.length ? invitees.map((invitee) => (
              <View key={String(invitee.inviteeUserId)} style={{ width: "100%", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0EDF4" }}>
                <Text style={{ color: "#26212C", fontSize: 16, fontWeight: "700" }}>{String(invitee.inviteeDisplayName ?? invitee.inviteeUserId ?? "Invitee")}</Text>
                <Text style={{ color: "#8B8593", marginTop: 4 }}>{String(invitee.status ?? "PENDING")}</Text>
              </View>
            )) : <Text style={{ color: "#FF1494", fontSize: 18 }}>No data</Text>}
          </View>
          <View style={{ marginTop: 24 }}>
            <GradientButton title="Invite" onPress={handleShare} />
          </View>
        </GlassPanel>
      )}
      </WinterScreen>
    </>
  );
}
