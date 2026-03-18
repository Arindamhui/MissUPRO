import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui";
import { COLORS, SPACING } from "@/theme";

function formatDate(value: unknown) {
  return new Date(String(value ?? "")).toLocaleString();
}

function statusColor(status: string) {
  if (status === "COMPLETED") return "#8BFFB7";
  if (status === "FAILED") return "#FF9D95";
  if (status === "REFUNDED") return "#8ED4FF";
  return "#FFD666";
}

export default function WalletHistoryRoute() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const topUps = trpc.wallet.getTopUpHistory.useQuery(undefined, { retry: false });
  const transactions = ((wallet.data as any)?.recentTransactions ?? []) as Array<Record<string, any>>;
  const [tab, setTab] = useState<"topups" | "wallet">(params.tab === "wallet" ? "wallet" : "topups");

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(12,19,69,0.22)", "rgba(20,20,56,0.78)", "rgba(8,14,47,0.98)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={8} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={26} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>Top-up Record</Text>
            <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>Review completed purchases and wallet ledger activity.</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
          <TouchableOpacity onPress={() => setTab("topups")} style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: tab === "topups" ? "#FFD666" : "rgba(255,255,255,0.08)", alignItems: "center" }}>
            <Text style={{ color: tab === "topups" ? "#2E1500" : COLORS.white, fontSize: 15, fontWeight: "900" }}>Top up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("wallet")} style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: tab === "wallet" ? "#FFD666" : "rgba(255,255,255,0.08)", alignItems: "center" }}>
            <Text style={{ color: tab === "wallet" ? "#2E1500" : COLORS.white, fontSize: 15, fontWeight: "900" }}>Balance</Text>
          </TouchableOpacity>
        </View>

        {tab === "topups" ? (
          <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20 }}>
            {topUps.isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (topUps.data?.length ?? 0) === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>No top-up records yet.</Text>
            ) : (
              topUps.data?.map((entry: any, index: number) => (
                <View key={String(entry.id)} style={{ paddingVertical: 14, borderBottomWidth: index < (topUps.data?.length ?? 0) - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800", flex: 1, paddingRight: 8 }}>{String(entry.packageName)}</Text>
                    <Badge text={String(entry.status)} color={statusColor(String(entry.status))} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12 }}>{formatDate(entry.createdAt)}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 4 }}>{String(entry.provider).replace(/_/g, " ")} • {Number(entry.coinsCredited ?? 0).toLocaleString()} coins</Text>
                      {entry.failureReason ? <Text style={{ color: "#FF9D95", fontSize: 12, marginTop: 6 }}>{String(entry.failureReason)}</Text> : null}
                    </View>
                    <Text style={{ color: "#FFD666", fontSize: 16, fontWeight: "900" }}>${Number(entry.amountUsd ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20 }}>
            {wallet.isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : transactions.length === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>No wallet activity yet.</Text>
            ) : (
              transactions.map((tx, index) => (
                <View key={String(tx.id ?? index)} style={{ paddingVertical: 14, borderBottomWidth: index < transactions.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ color: COLORS.white, fontWeight: "800", flex: 1, paddingRight: 8 }}>{String(tx.description ?? tx.transactionType ?? "Transaction")}</Text>
                    <Badge text={String(tx.ledger ?? "COIN")} color={String(tx.ledger ?? "COIN") === "DIAMOND" ? "#78E4FF" : "#FFD666"} />
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.58)", marginBottom: 6 }}>{formatDate(tx.createdAt)}</Text>
                  <Text style={{ color: Number(tx.amount ?? 0) >= 0 ? "#8BFFB7" : "#FF9D95", fontWeight: "900" }}>
                    {Number(tx.amount ?? 0) >= 0 ? "+" : ""}{Number(tx.amount ?? 0)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}