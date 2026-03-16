import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, SectionHeader, Badge } from "@/components/ui";
import { COLORS } from "@/theme";

export default function WalletHistoryRoute() {
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const transactions = ((wallet.data as any)?.recentTransactions ?? []) as Array<Record<string, any>>;

  return (
    <Screen scroll>
      <SectionHeader title="Wallet History" />
      {wallet.isLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : transactions.length === 0 ? (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>No wallet activity yet.</Text>
        </Card>
      ) : (
        transactions.map((tx, index) => (
          <Card key={String(tx.id ?? index)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ color: COLORS.text, fontWeight: "700", flex: 1 }}>{String(tx.description ?? tx.transactionType ?? "Transaction")}</Text>
              <Badge text={String(tx.ledger ?? "COIN")} color={String(tx.ledger ?? "COIN") === "DIAMOND" ? COLORS.diamond : COLORS.primary} />
            </View>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 4 }}>
              {new Date(tx.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: Number(tx.amount ?? 0) >= 0 ? COLORS.success : COLORS.danger, fontWeight: "700" }}>
              {Number(tx.amount ?? 0) >= 0 ? "+" : ""}{Number(tx.amount ?? 0)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}