import React from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, CoinDisplay, DiamondDisplay, Button, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useWalletStore } from "@/store";

export default function WalletScreen() {
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const paymentIntent = trpc.payment.createPaymentIntent.useMutation();

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

      {/* Transaction History */}
      <SectionHeader title="Recent Transactions" action="See All" />
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
