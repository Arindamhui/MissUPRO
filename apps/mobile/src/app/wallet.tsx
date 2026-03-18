import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

type PayoutMethod = "PAYPAL" | "BANK_TRANSFER" | "PAYONEER" | "CRYPTO";

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatDate(value: unknown) {
  return new Date(String(value ?? "")).toLocaleDateString();
}

function WalletAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 10,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        gap: 8,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,214,102,0.16)", alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons color="#FFD666" name={icon} size={22} />
      </View>
      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PackageChip({ pkg, onPress }: { pkg: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 148,
        marginRight: 12,
        borderRadius: 24,
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: pkg.isFeatured || pkg.popular ? "rgba(255,214,102,0.62)" : "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#FFD666", fontSize: 14, fontWeight: "800" }}>{pkg.isFeatured || pkg.popular ? "HOT" : "TOP UP"}</Text>
        <MaterialCommunityIcons color="#FFD666" name="wallet-plus" size={20} />
      </View>
      <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginTop: 18 }}>{formatCompact(Number(pkg.coins ?? pkg.amount ?? 0))}</Text>
      <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 4 }}>coins</Text>
      <Text style={{ color: "#9ED6FF", fontSize: 16, fontWeight: "800", marginTop: 16 }}>{String(pkg.priceDisplay ?? pkg.price ?? "-")}</Text>
      {Number(pkg.bonusCoins ?? 0) > 0 ? <Text style={{ color: "#8BFFB7", marginTop: 6, fontSize: 12 }}>+{Number(pkg.bonusCoins).toLocaleString()} bonus</Text> : null}
    </TouchableOpacity>
  );
}

function HistoryRow({ item }: { item: any }) {
  const amount = Number(item.amount ?? 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <MaterialCommunityIcons color={item.ledger === "DIAMOND" ? "#78E4FF" : "#FFD666"} name={item.ledger === "DIAMOND" ? "diamond-stone" : "cash-plus"} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "700" }}>{String(item.description ?? item.transactionType ?? "Wallet activity")}</Text>
        <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 4, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={{ color: amount >= 0 ? "#90F0A8" : "#FF9D95", fontWeight: "800", fontSize: 15 }}>{amount >= 0 ? "+" : ""}{amount}</Text>
    </View>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const topUps = trpc.wallet.getTopUpHistory.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false, enabled: isAuthenticated });
  const paymentIntent = trpc.payment.createPaymentIntent.useMutation();
  const requestWithdrawal = trpc.wallet.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawalDiamonds("");
      setPayoutAccount("");
      void wallet.refetch();
      Alert.alert("Withdrawal Requested", "Your withdrawal request was submitted for admin review.");
    },
    onError: (error: any) => {
      Alert.alert("Withdrawal Error", error?.message ?? "Unable to request withdrawal.");
    },
  });
  const [withdrawalDiamonds, setWithdrawalDiamonds] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("PAYPAL");
  const [payoutAccount, setPayoutAccount] = useState("");

  const handlePurchase = (pkg: any) => {
    Alert.alert(
      "Purchase Coins",
      `Buy ${pkg.coins?.toLocaleString() ?? pkg.amount?.toLocaleString()} coins for ${pkg.priceDisplay ?? pkg.price}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: () => {
            const provider = Platform.OS === "ios" ? "APPLE_IAP" : "GOOGLE_PLAY";
            paymentIntent.mutate({ coinPackageId: pkg.id, provider }, {
              onSuccess: (result: any) => {
                Alert.alert(
                  "Payment Created",
                  `Payment ${result.paymentId} is ready for ${result.provider}. Complete checkout in the provider SDK next.`,
                );
              },
              onError: (error: any) => {
                Alert.alert("Payment Error", error?.message ?? "Unable to start coin purchase.");
              },
            });
          },
        },
      ],
    );
  };

  const coinPackages = (packages.data ?? []) as any[];
  const creatorEconomyPolicy = creatorEconomy.data;
  const currentDiamondBalance = Number(wallet.data?.diamondBalance ?? diamonds ?? 0);
  const withdrawDiamondAmount = Math.max(0, Number(withdrawalDiamonds || 0));
  const withdrawUsdEstimate = useMemo(() => {
    if (!creatorEconomyPolicy) return 0;
    return Number(((withdrawDiamondAmount / 100) * creatorEconomyPolicy.diamondValueUsdPer100).toFixed(2));
  }, [creatorEconomyPolicy, withdrawDiamondAmount]);

  const submitWithdrawal = () => {
    if (!withdrawDiamondAmount) {
      Alert.alert("Enter diamonds", "Specify how many diamonds you want to withdraw.");
      return;
    }
    if (!payoutAccount.trim()) {
      Alert.alert("Missing payout details", "Enter the payout account or destination for this request.");
      return;
    }

    requestWithdrawal.mutate({
      amountDiamonds: withdrawDiamondAmount,
      payoutMethod,
      payoutDetails: {
        account: payoutAccount.trim(),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(12,19,69,0.22)", "rgba(20,20,56,0.78)", "rgba(8,14,47,0.98)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/me" as never))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={26} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>Wallet Center</Text>
            <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>Top up, review records, manage balance, and unlock VIP perks.</Text>
          </View>
        </View>

        {!isAuthenticated ? (
          <View style={{ borderRadius: 28, padding: 24, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Wallet balances, top-up records, and VIP activation are protected account features.</Text>
            <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }} />
          </View>
        ) : (
          <>
            <LinearGradient colors={["#FFB457", "#FF8A59", "#E76E90"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 22, marginBottom: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 }}>AVAILABLE BALANCE</Text>
                  <Text style={{ color: "#2E1500", fontSize: 34, fontWeight: "900", marginTop: 10 }}>{Number(wallet.data?.coinBalance ?? coins ?? 0).toLocaleString()}</Text>
                  <Text style={{ color: "rgba(63,18,0,0.72)", marginTop: 2 }}>coins ready for gifts, VIP, and store unlocks</Text>
                </View>
                <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons color="#2E1500" name="wallet-membership" size={42} />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.2)" }}>
                  <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 12, fontWeight: "700" }}>Coins</Text>
                  <Text style={{ color: "#2E1500", fontSize: 22, fontWeight: "900", marginTop: 6 }}>{Number(wallet.data?.coinBalance ?? coins ?? 0).toLocaleString()}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.2)" }}>
                  <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 12, fontWeight: "700" }}>Diamonds</Text>
                  <Text style={{ color: "#2E1500", fontSize: 22, fontWeight: "900", marginTop: 6 }}>{currentDiamondBalance.toLocaleString()}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <TouchableOpacity onPress={() => router.push("/wallet/purchase" as never)} style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: "#2E1500", alignItems: "center" }}>
                  <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>Top up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/wallet/history" as never)} style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.26)", alignItems: "center" }}>
                  <Text style={{ color: "#2E1500", fontSize: 15, fontWeight: "800" }}>Top-up Record</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
              <WalletAction icon="wallet-plus-outline" label="Top up" onPress={() => router.push("/wallet/purchase" as never)} />
              <WalletAction icon="history" label="Top-up Record" onPress={() => router.push({ pathname: "/wallet/history" as never, params: { tab: "topups" } } as never)} />
              <WalletAction icon="crown-outline" label="VIP Center" onPress={() => router.push("/vip" as never)} />
              <WalletAction icon="cash-refund" label="Balance" onPress={() => router.push({ pathname: "/wallet/history" as never, params: { tab: "wallet" } } as never)} />
            </View>

            <LinearGradient colors={["rgba(255,215,102,0.18)", "rgba(255,153,85,0.16)"]} style={{ borderRadius: 28, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,215,102,0.18)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>Lucky bonus zone</Text>
                  <Text style={{ color: "rgba(255,255,255,0.68)", lineHeight: 20, marginTop: 6 }}>
                    Featured packages and VIP subscriptions use live backend pricing. Bonus coins and active tiers update automatically from admin configuration.
                  </Text>
                </View>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,214,102,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons color="#FFD666" name="gift-open-outline" size={28} />
                </View>
              </View>
            </LinearGradient>

            <View style={{ marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Top up</Text>
              <TouchableOpacity onPress={() => router.push("/wallet/purchase" as never)}>
                <Text style={{ color: "#FFD666", fontWeight: "800" }}>See all</Text>
              </TouchableOpacity>
            </View>
            {packages.isLoading ? (
              <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.lg }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6, paddingRight: 4, marginBottom: 18 }}>
                {coinPackages.slice(0, 6).map((pkg) => (
                  <PackageChip key={String(pkg.id)} pkg={pkg} onPress={() => handlePurchase(pkg)} />
                ))}
              </ScrollView>
            )}

            <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20, marginBottom: 18 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Balance</Text>
                <Text style={{ color: "#FFD666", fontWeight: "800" }}>Cash out</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.68)", lineHeight: 20, marginBottom: 18 }}>
                Diamonds earned from gifts convert using the same creator-economy policy enforced by the API. Review the estimate before submitting a payout request.
              </Text>

              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, borderRadius: 20, padding: 16, backgroundColor: "rgba(10,16,42,0.56)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Diamonds</Text>
                  <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900", marginTop: 6 }}>{currentDiamondBalance.toLocaleString()}</Text>
                </View>
                <View style={{ flex: 1, borderRadius: 20, padding: 16, backgroundColor: "rgba(10,16,42,0.56)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Estimated payout</Text>
                  <Text style={{ color: "#8BFFB7", fontSize: 24, fontWeight: "900", marginTop: 6 }}>{formatUsd(withdrawUsdEstimate)}</Text>
                </View>
              </View>

              <TextInput
                value={withdrawalDiamonds}
                onChangeText={setWithdrawalDiamonds}
                keyboardType="numeric"
                placeholder="Diamonds to withdraw"
                placeholderTextColor="rgba(255,255,255,0.34)"
                style={{ borderRadius: 18, backgroundColor: "rgba(10,16,42,0.56)", color: COLORS.white, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 }}
              />
              <TextInput
                value={payoutAccount}
                onChangeText={setPayoutAccount}
                placeholder={payoutMethod === "PAYPAL" ? "PayPal account" : payoutMethod === "CRYPTO" ? "Wallet address" : "Beneficiary or account"}
                placeholderTextColor="rgba(255,255,255,0.34)"
                style={{ borderRadius: 18, backgroundColor: "rgba(10,16,42,0.56)", color: COLORS.white, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 }}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2, marginBottom: 12 }}>
                {(["PAYPAL", "BANK_TRANSFER", "PAYONEER", "CRYPTO"] as PayoutMethod[]).map((method) => (
                  <TouchableOpacity key={method} onPress={() => setPayoutMethod(method)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: payoutMethod === method ? "#FFD666" : "rgba(255,255,255,0.08)" }}>
                    <Text style={{ color: payoutMethod === method ? "#2E1500" : COLORS.white, fontSize: 12, fontWeight: "800" }}>{method.replace("_", " ")}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {creatorEconomyPolicy ? (
                <Text style={{ color: "rgba(255,255,255,0.58)", marginBottom: 14, fontSize: 12 }}>
                  100 diamonds = {formatUsd(creatorEconomyPolicy.diamondValueUsdPer100)}. Minimum withdrawal {formatUsd(creatorEconomyPolicy.withdrawLimits.minUsd)}.
                </Text>
              ) : null}

              <Button
                title="Request Withdrawal"
                onPress={submitWithdrawal}
                loading={requestWithdrawal.isPending}
                disabled={withdrawDiamondAmount <= 0 || withdrawDiamondAmount > currentDiamondBalance}
              />
            </View>

            <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20, marginBottom: 18 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Recent activity</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: "/wallet/history" as never, params: { tab: "wallet" } } as never)}>
                  <Text style={{ color: "#FFD666", fontWeight: "800" }}>Open record</Text>
                </TouchableOpacity>
              </View>
              {wallet.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : ((wallet.data as any)?.recentTransactions?.length ?? 0) > 0 ? (
                (wallet.data as any).recentTransactions.slice(0, 4).map((item: any) => <HistoryRow key={String(item.id)} item={item} />)
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.62)" }}>No wallet activity yet.</Text>
              )}
            </View>

            <View style={{ borderRadius: 28, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Latest top-ups</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: "/wallet/history" as never, params: { tab: "topups" } } as never)}>
                  <Text style={{ color: "#FFD666", fontWeight: "800" }}>All records</Text>
                </TouchableOpacity>
              </View>
              {topUps.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (topUps.data?.length ?? 0) > 0 ? (
                topUps.data?.slice(0, 3).map((entry: any) => (
                  <View key={String(entry.id)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "800" }}>{String(entry.packageName)}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 4 }}>{formatDate(entry.createdAt)} • {String(entry.provider).replace(/_/g, " ")}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#FFD666", fontWeight: "800" }}>{formatUsd(Number(entry.amountUsd ?? 0))}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, marginTop: 4 }}>{String(entry.status)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: "rgba(255,255,255,0.62)" }}>No top-up records yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
