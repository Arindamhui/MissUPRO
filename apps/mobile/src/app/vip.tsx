import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, Badge, Button, CoinDisplay } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";

const VIP_TIERS = [
  { id: "silver", name: "Silver", price: 500, duration: "30 days", perks: ["2x XP bonus", "Silver badge", "Priority matching", "Ad-free experience"] },
  { id: "gold", name: "Gold", price: 1500, duration: "30 days", perks: ["3x XP bonus", "Gold badge", "Priority matching", "Ad-free", "Exclusive gifts", "Profile boost"] },
  { id: "platinum", name: "Platinum", price: 5000, duration: "30 days", perks: ["5x XP bonus", "Platinum badge", "Top priority matching", "Ad-free", "All exclusive gifts", "Max profile boost", "Custom name color", "VIP support"] },
];

export default function VipScreen() {
  const subscription = trpc.vip.getSubscription.useQuery(undefined, { retry: false });
  const current = subscription.data as any;

  return (
    <Screen scroll>
      {/* Current Status */}
      {current?.tier ? (
        <Card style={{ alignItems: "center", backgroundColor: COLORS.primaryLight, marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>✨ VIP {current.tier}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>
            Expires: {current.expiresAt ? new Date(current.expiresAt).toLocaleDateString() : "N/A"}
          </Text>
        </Card>
      ) : (
        <Card style={{ alignItems: "center", marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>Upgrade to VIP</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4, textAlign: "center" }}>
            Unlock exclusive perks and stand out
          </Text>
        </Card>
      )}

      {/* Tiers */}
      {VIP_TIERS.map((tier) => (
        <Card key={tier.id} style={{
          borderWidth: current?.tier === tier.id ? 2 : 0,
          borderColor: COLORS.primary,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{tier.name}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{tier.duration}</Text>
            </View>
            <CoinDisplay amount={tier.price} />
          </View>

          <View style={{ gap: 6, marginBottom: SPACING.md }}>
            {tier.perks.map((perk) => (
              <View key={perk} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14 }}>✓</Text>
                <Text style={{ fontSize: 14, color: COLORS.text }}>{perk}</Text>
              </View>
            ))}
          </View>

          <Button
            title={current?.tier === tier.id ? "Current Plan" : "Subscribe"}
            onPress={() => {}}
            variant={current?.tier === tier.id ? "secondary" : "primary"}
            disabled={current?.tier === tier.id}
          />
        </Card>
      ))}
    </Screen>
  );
}
