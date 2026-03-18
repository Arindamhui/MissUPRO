import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

export default function WalletPurchaseRoute() {
  const insets = useSafeAreaInsets();
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
  const packages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false });
  const paymentIntent = trpc.payment.createPaymentIntent.useMutation();
  const rows = (packages.data ?? []) as any[];
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPackageId && rows[0]?.id) {
      setSelectedPackageId(String(rows[0].id));
    }
  }, [rows, selectedPackageId]);

  const selectedPackage = useMemo(() => rows.find((pkg) => String(pkg.id) === selectedPackageId) ?? rows[0], [rows, selectedPackageId]);

  const startCheckout = (pkg: any) => {
    const provider = Platform.OS === "ios" ? "APPLE_IAP" : "GOOGLE_PLAY";
    paymentIntent.mutate({ coinPackageId: pkg.id, provider }, {
      onSuccess: (result: any) => Alert.alert("Payment Created", `Continue checkout in ${result.provider}. Payment ID: ${result.paymentId}`),
      onError: (error: any) => Alert.alert("Payment Error", error?.message ?? "Unable to start coin purchase."),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(12,19,69,0.22)", "rgba(20,20,56,0.78)", "rgba(8,14,47,0.98)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={10} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={26} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>Top up</Text>
            <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>Choose a coin package and continue checkout with the platform provider.</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
          <TouchableOpacity style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: "#FFD666", alignItems: "center" }}>
            <Text style={{ color: "#2E1500", fontSize: 15, fontWeight: "900" }}>Top up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: "/wallet/history" as never, params: { tab: "topups" } } as never)} style={{ flex: 1, borderRadius: 18, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center" }}>
            <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "900" }}>Top-up Record</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#FFB457", "#FF8A59", "#E76E90"]} style={{ borderRadius: 28, padding: 20, marginBottom: 18 }}>
          <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 13, fontWeight: "800" }}>SPECIAL REWARD</Text>
          <Text style={{ color: "#2E1500", fontSize: 30, fontWeight: "900", marginTop: 8 }}>{Number(selectedPackage?.coins ?? selectedPackage?.amount ?? 0).toLocaleString()}</Text>
          <Text style={{ color: "rgba(63,18,0,0.72)", marginTop: 4 }}>coins on the selected package</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1, borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.18)" }}>
              <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 12, fontWeight: "700" }}>Price</Text>
              <Text style={{ color: "#2E1500", fontSize: 22, fontWeight: "900", marginTop: 6 }}>{String(selectedPackage?.priceDisplay ?? selectedPackage?.price ?? "-")}</Text>
            </View>
            <View style={{ flex: 1, borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.18)" }}>
              <Text style={{ color: "rgba(63,18,0,0.72)", fontSize: 12, fontWeight: "700" }}>Bonus</Text>
              <Text style={{ color: "#2E1500", fontSize: 22, fontWeight: "900", marginTop: 6 }}>+{Number(selectedPackage?.bonusCoins ?? 0).toLocaleString()}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ borderRadius: 28, padding: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>Coin packages</Text>
            <TouchableOpacity onPress={() => Alert.alert("Top up for friend", "Friend top-up is not wired to the backend yet. This screen stays aligned to the current purchase contract.") }>
              <Text style={{ color: "#FFD666", fontWeight: "800" }}>Top up for friend</Text>
            </TouchableOpacity>
          </View>

          {packages.isLoading ? (
            <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.lg }} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {rows.map((pkg) => {
                const selected = String(pkg.id) === String(selectedPackage?.id);
                return (
                  <TouchableOpacity
                    key={String(pkg.id)}
                    onPress={() => setSelectedPackageId(String(pkg.id))}
                    style={{
                      width: "47%",
                      borderRadius: 22,
                      padding: 16,
                      backgroundColor: selected ? "rgba(255,214,102,0.18)" : "rgba(255,255,255,0.05)",
                      borderWidth: 1,
                      borderColor: selected ? "#FFD666" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: selected ? "#FFD666" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "800" }}>{pkg.isFeatured || pkg.popular ? "POPULAR" : "PACKAGE"}</Text>
                      {selected ? <MaterialCommunityIcons color="#FFD666" name="check-circle" size={20} /> : null}
                    </View>
                    <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginTop: 16 }}>{Number(pkg.coins ?? pkg.amount ?? 0).toLocaleString()}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 4 }}>coins</Text>
                    <Text style={{ color: "#9ED6FF", fontWeight: "800", marginTop: 14 }}>{String(pkg.priceDisplay ?? pkg.price ?? "-")}</Text>
                    {Number(pkg.bonusCoins ?? 0) > 0 ? <Text style={{ color: "#8BFFB7", fontSize: 12, marginTop: 6 }}>+{Number(pkg.bonusCoins).toLocaleString()} bonus coins</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ borderRadius: 28, padding: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900", marginBottom: 10 }}>Checkout summary</Text>
          {creatorEconomy.data ? (
            <Text style={{ color: "rgba(255,255,255,0.62)", lineHeight: 20, marginBottom: 14 }}>
              Base coin rate is ${creatorEconomy.data.coinPriceUsd.toFixed(4)} per coin. All purchases feed the same gift, VIP, and withdrawal economy enforced by the backend.
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: "rgba(255,255,255,0.62)" }}>Provider</Text>
            <Text style={{ color: COLORS.white, fontWeight: "800" }}>{Platform.OS === "ios" ? "APPLE IAP" : "GOOGLE PLAY"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.62)" }}>Selected pack</Text>
            <Text style={{ color: COLORS.white, fontWeight: "800" }}>{String(selectedPackage?.priceDisplay ?? selectedPackage?.price ?? "-")}</Text>
          </View>
          <Button title="Continue checkout" onPress={() => selectedPackage && startCheckout(selectedPackage)} loading={paymentIntent.isPending} disabled={!selectedPackage} />
        </View>
      </ScrollView>
    </View>
  );
}