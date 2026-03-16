import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, CoinDisplay, DiamondDisplay, Button, SectionHeader, Input, Badge } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useWalletStore } from "@/store";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

type PayoutMethod = "PAYPAL" | "BANK_TRANSFER" | "PAYONEER" | "CRYPTO";

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function WalletScreen() {
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
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
    <Screen scroll>
      {/* Balance Cards */}
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>Coins</Text>
          <CoinDisplay amount={wallet.data?.coinBalance ?? coins} size="lg" />
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>Diamonds</Text>
          <DiamondDisplay amount={wallet.data?.diamondBalance ?? diamonds} size="lg" />
        </Card>
      </View>

      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
        <Button title="Coin Purchase Screen" variant="outline" onPress={() => router.push("/wallet/purchase")} style={{ flex: 1 }} />
        <Button title="Transaction History" variant="secondary" onPress={() => router.push("/wallet/history")} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Creator Economy" />
      <Card>
        {creatorEconomy.isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : creatorEconomyPolicy ? (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: "700" }}>Policy Snapshot</Text>
              <Badge text={`${creatorEconomyPolicy.commission.platformCommissionPercent}% platform`} color={COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Coin price: {formatUsd(creatorEconomyPolicy.coinPriceUsd)} per coin
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Gift conversion: {creatorEconomyPolicy.diamondConversion.coins} coins to {creatorEconomyPolicy.diamondConversion.diamonds} diamonds
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Diamond payout: 100 diamonds = {formatUsd(creatorEconomyPolicy.diamondValueUsdPer100)}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>
              Withdrawal window: {formatUsd(creatorEconomyPolicy.withdrawLimits.minUsd)} min
              {creatorEconomyPolicy.withdrawLimits.maxUsd != null ? ` / ${formatUsd(creatorEconomyPolicy.withdrawLimits.maxUsd)} max` : ""}
            </Text>
          </>
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>Creator economy settings are unavailable right now.</Text>
        )}
      </Card>

      {/* Buy Coins */}
      <SectionHeader title="Buy Coins" />
      {packages.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
      ) : coinPackages.length === 0 ? (
        <Card>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: "center" }}>
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
                backgroundColor: COLORS.card,
                borderRadius: RADIUS.lg,
                padding: SPACING.md,
                alignItems: "center",
                borderWidth: pkg.popular ? 2 : 1,
                borderColor: pkg.popular ? COLORS.primary : COLORS.border,
                position: "relative",
              }}
            >
              {pkg.popular && (
                <View style={{ position: "absolute", top: -10, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
                  <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: "600" }}>POPULAR</Text>
                </View>
              )}
              {(pkg.bestValue || pkg.best) && (
                <View style={{ position: "absolute", top: -10, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
                  <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: "600" }}>BEST VALUE</Text>
                </View>
              )}
              <Text style={{ fontSize: 24, marginBottom: 4 }}>🪙</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>
                {(pkg.coins ?? pkg.amount ?? 0).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary, marginTop: 4 }}>
                {pkg.priceDisplay ?? pkg.price}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <SectionHeader title="Withdraw Diamonds" />
      <Card>
        <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
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
        />
        <Input
          label="Payout account"
          value={payoutAccount}
          onChangeText={setPayoutAccount}
          placeholder={payoutMethod === "PAYPAL" ? "name@example.com" : payoutMethod === "CRYPTO" ? "Wallet address" : "Account or beneficiary"}
        />
        <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
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
              style={{ minWidth: 120 }}
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

      {/* Transaction History */}
      <SectionHeader title="Recent Transactions" action="See All" onAction={() => router.push("/wallet/history")} />
      {wallet.isLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <Card>
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
                  borderBottomColor: COLORS.border,
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.text }}>
                    {tx.description ?? tx.type}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
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
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: "center", paddingVertical: SPACING.md }}>
              No transactions yet
            </Text>
          )}
        </Card>
      )}
    </Screen>
  );
}
