import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, CoinDisplay, DiamondDisplay, Button, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useWalletStore } from "@/store";

const COIN_PACKAGES = [
  { id: "1", coins: 100, price: "$0.99" },
  { id: "2", coins: 500, price: "$4.99" },
  { id: "3", coins: 1000, price: "$9.99", popular: true },
  { id: "4", coins: 5000, price: "$44.99" },
  { id: "5", coins: 10000, price: "$84.99", best: true },
  { id: "6", coins: 50000, price: "$399.99" },
];

export default function WalletScreen() {
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });

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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {COIN_PACKAGES.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
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
            {pkg.best && (
              <View style={{ position: "absolute", top: -10, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: "600" }}>BEST VALUE</Text>
              </View>
            )}
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🪙</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>{pkg.coins.toLocaleString()}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary, marginTop: 4 }}>{pkg.price}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction History */}
      <SectionHeader title="Recent Transactions" action="See All" />
      <Card>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Transaction history loaded from wallet API</Text>
      </Card>
    </Screen>
  );
}
