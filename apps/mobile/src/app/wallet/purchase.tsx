import React from "react";
import { Alert, ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, Button, CoinDisplay, SectionHeader } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

export default function WalletPurchaseRoute() {
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const paymentIntent = trpc.payment.createPaymentIntent.useMutation();
  const rows = (packages.data ?? []) as any[];

  const startCheckout = (pkg: any) => {
    const provider = Platform.OS === "ios" ? "APPLE_IAP" : "GOOGLE_PLAY";
    paymentIntent.mutate({ coinPackageId: pkg.id, provider }, {
      onSuccess: (result: any) => Alert.alert("Payment Created", `Continue checkout in ${result.provider}. Payment ID: ${result.paymentId}`),
      onError: (error: any) => Alert.alert("Payment Error", error?.message ?? "Unable to start coin purchase."),
    });
  };

  return (
    <Screen scroll>
      <SectionHeader title="Coin Packages" />
      <Card>
        {creatorEconomy.data ? (
          <>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
              Coin price: ${creatorEconomy.data.coinPriceUsd.toFixed(4)} per coin
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>
              Every purchase feeds the same gift and withdrawal economy shown throughout the app.
            </Text>
          </>
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>Loading creator economy policy…</Text>
        )}
      </Card>

      {packages.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {rows.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => startCheckout(pkg)}
              style={{
                width: "31%",
                backgroundColor: COLORS.card,
                borderRadius: RADIUS.lg,
                padding: SPACING.md,
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <CoinDisplay amount={pkg.coins ?? pkg.amount ?? 0} size="md" />
              <Text style={{ color: COLORS.primary, fontWeight: "700", marginTop: 10 }}>{pkg.priceDisplay ?? pkg.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Button title="Back to Wallet" variant="secondary" onPress={() => Alert.alert("Wallet", "Use the back gesture or tab navigation to return to the wallet summary.")} />
    </Screen>
  );
}