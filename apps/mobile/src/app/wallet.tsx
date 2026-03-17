import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Screen, Card, CoinDisplay, DiamondDisplay, Button, SectionHeader, Input, Badge } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

type PayoutMethod = "PAYPAL" | "BANK_TRANSFER" | "PAYONEER" | "CRYPTO";

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false, enabled: isAuthenticated });
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
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <Screen scroll style={{ backgroundColor: "transparent" }}>
        <View style={{ paddingTop: insets.top + 6 }}>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginBottom: SPACING.sm }}>Wallet</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.lg }}>Coins, diamonds, purchases, and withdrawals stay connected to backend pricing and payout policy.</Text>

          {!isAuthenticated ? (
            <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Wallet balances, purchases, and payout requests are protected account features.</Text>
              <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }} />
            </Card>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
                <Card style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", marginBottom: 8 }}>Coins</Text>
                  <CoinDisplay amount={wallet.data?.coinBalance ?? coins} size="lg" />
                </Card>
                <Card style={{ flex: 1, alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", marginBottom: 8 }}>Diamonds</Text>
                  <DiamondDisplay amount={wallet.data?.diamondBalance ?? diamonds} size="lg" />
                </Card>
              </View>

              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                <Button title="Coin Purchase Screen" variant="outline" onPress={() => router.push("/wallet/purchase")} style={{ flex: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.08)" }} />
                <Button title="Transaction History" variant="secondary" onPress={() => router.push("/wallet/history")} style={{ flex: 1 }} />
              </View>

              <SectionHeader title="Creator Economy" />
              <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                {creatorEconomy.isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : creatorEconomyPolicy ? (
                  <>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
                      <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "700" }}>Policy Snapshot</Text>
                      <Badge text={`${creatorEconomyPolicy.commission.platformCommissionPercent}% platform`} color={COLORS.primary} />
                    </View>
                    <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
                      Coin price: {formatUsd(creatorEconomyPolicy.coinPriceUsd)} per coin
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
                      Gift conversion: {creatorEconomyPolicy.diamondConversion.coins} coins to {creatorEconomyPolicy.diamondConversion.diamonds} diamonds
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>
                      Diamond payout: 100 diamonds = {formatUsd(creatorEconomyPolicy.diamondValueUsdPer100)}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      Withdrawal window: {formatUsd(creatorEconomyPolicy.withdrawLimits.minUsd)} min
                      {creatorEconomyPolicy.withdrawLimits.maxUsd != null ? ` / ${formatUsd(creatorEconomyPolicy.withdrawLimits.maxUsd)} max` : ""}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>Creator economy settings are unavailable right now.</Text>
                )}
              </Card>

              <SectionHeader title="Buy Coins" />
              {packages.isLoading ? (
                <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.lg }} />
              ) : coinPackages.length === 0 ? (
                <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, textAlign: "center" }}>
                    Coin packages are loaded from backend configuration. No active package is available right now.
                  </Text>
                </Card>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                  {(coinPackages as any[]).map((pkg: any) => (
                    <TouchableOpacity
                      key={pkg.id}
                      onPress={() => handlePurchase(pkg)}
                      style={{
                        width: "31%",
                        backgroundColor: "rgba(255,255,255,0.1)",
                        borderRadius: RADIUS.lg,
                        padding: SPACING.md,
                        alignItems: "center",
                        borderWidth: pkg.popular ? 2 : 1,
                        borderColor: pkg.popular ? "#9BC9FF" : "rgba(255,255,255,0.1)",
                        position: "relative",
                      }}
                    >
                      {pkg.popular ? (
                        <View style={{ position: "absolute", top: -10, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
                          <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: "600" }}>POPULAR</Text>
                        </View>
                      ) : null}
                      {pkg.bestValue || pkg.best ? (
                        <View style={{ position: "absolute", top: -10, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
                          <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: "600" }}>BEST VALUE</Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>🪙</Text>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.white }}>
                        {(pkg.coins ?? pkg.amount ?? 0).toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#9BC9FF", marginTop: 4 }}>
                        {pkg.priceDisplay ?? pkg.price}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <SectionHeader title="Withdraw Diamonds" />
              <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.sm }}>
                  Convert creator diamonds into withdrawable cash using the same limits enforced by the API.
                </Text>
                <View style={{ marginBottom: SPACING.sm }}>
                  <DiamondDisplay amount={currentDiamondBalance} size="md" />
                </View>
                <Input
                  label="Diamonds to withdraw"
                  value={withdrawalDiamonds}
                  onChangeText={setWithdrawalDiamonds}
                  keyboardType="numeric"
                  placeholder="900"
                  style={{ backgroundColor: "rgba(8,12,32,0.36)", color: COLORS.white }}
                />
                <Input
                  label="Payout account"
                  value={payoutAccount}
                  onChangeText={setPayoutAccount}
                  placeholder={payoutMethod === "PAYPAL" ? "name@example.com" : payoutMethod === "CRYPTO" ? "Wallet address" : "Account or beneficiary"}
                  style={{ backgroundColor: "rgba(8,12,32,0.36)", color: COLORS.white }}
                />
                <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.sm }}>
                  Estimated payout: {formatUsd(withdrawUsdEstimate)}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.md }}>
                  {(["PAYPAL", "BANK_TRANSFER", "PAYONEER", "CRYPTO"] as PayoutMethod[]).map((method) => (
                    <Button
                      key={method}
                      title={method.replace("_", " ")}
                      size="sm"
                      variant={payoutMethod === method ? "primary" : "outline"}
                      onPress={() => setPayoutMethod(method)}
                      style={{ minWidth: 120, borderColor: payoutMethod === method ? undefined : "rgba(255,255,255,0.3)", backgroundColor: payoutMethod === method ? undefined : "rgba(255,255,255,0.08)" }}
                    />
                  ))}
                </View>
                <Button
                  title="Request Withdrawal"
                  onPress={submitWithdrawal}
                  loading={requestWithdrawal.isPending}
                  disabled={withdrawDiamondAmount <= 0 || withdrawDiamondAmount > currentDiamondBalance}
                />
              </Card>

              <SectionHeader title="Recent Transactions" action="See All" onAction={() => router.push("/wallet/history")} />
              {wallet.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  {(wallet.data as any)?.recentTransactions?.length ? (
                    (wallet.data as any).recentTransactions.slice(0, 10).map((tx: any, i: number) => (
                      <View
                        key={tx.id ?? i}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 10,
                          borderBottomWidth: i < Math.min((wallet.data as any).recentTransactions.length, 10) - 1 ? 1 : 0,
                          borderBottomColor: "rgba(255,255,255,0.1)",
                        }}
                      >
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.white }}>
                            {tx.description ?? tx.type}
                          </Text>
                          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: (tx.amount ?? 0) >= 0 ? COLORS.success : COLORS.danger,
                          }}
                        >
                          {(tx.amount ?? 0) >= 0 ? "+" : ""}{tx.amount}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, textAlign: "center", paddingVertical: SPACING.md }}>
                      No transactions yet
                    </Text>
                  )}
                </Card>
              )}
            </>
          )}
        </View>
      </Screen>
    </View>
  );
}
