import { useClerk, useUser } from "@clerk/clerk-expo";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Card, CoinDisplay, DiamondDisplay, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { router } from "expo-router";

export default function MeScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const userId = useAuthStore((s) => s.userId);
  const authMode = useAuthStore((s) => s.authMode);
  const guestName = useAuthStore((s) => s.guestName);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false, enabled: authMode === "authenticated" });

  const menuItems = [
    { icon: "🪙", label: "Wallet", route: "/wallet" },
    { icon: "👑", label: "VIP", route: "/vip" },
    { icon: "📞", label: "Call History", route: "/call-history" },
    { icon: "🎁", label: "Referrals", route: "/referrals" },
    { icon: "🏆", label: "Levels & Badges", route: "/levels" },
    { icon: "📊", label: "Creator Dashboard", route: "/creator-dashboard" },
    { icon: "⚙️", label: "Settings", route: "/settings" },
  ];

  return (
    <Screen scroll>
      {/* Profile Header */}
      <View style={{ alignItems: "center", paddingVertical: SPACING.lg }}>
        <Avatar size={96} />
        <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text, marginTop: SPACING.md }}>
          {user?.fullName || user?.primaryEmailAddress?.emailAddress || guestName || (userId ? "User" : "Guest")}
        </Text>
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
          <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full }}>
            <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600" }}>
              {authMode === "guest" ? "Guest Access" : `Lv.${level.data?.level ?? 1}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Wallet Summary */}
      <Card style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <TouchableOpacity onPress={() => router.push("/wallet")} style={{ alignItems: "center" }}>
          <CoinDisplay amount={coins} size="lg" />
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Coins</Text>
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: COLORS.border }} />
        <TouchableOpacity onPress={() => router.push("/wallet")} style={{ alignItems: "center" }}>
          <DiamondDisplay amount={diamonds} size="lg" />
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Diamonds</Text>
        </TouchableOpacity>
      </Card>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.label}
          onPress={() => router.push(item.route as any)}
          style={{
            flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md,
            paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 22, marginRight: SPACING.md }}>{item.icon}</Text>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: COLORS.text }}>{item.label}</Text>
          <Text style={{ color: COLORS.textSecondary }}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Logout */}
      {authMode === "guest" ? (
        <Button
          title="Sign In To Sync Progress"
          variant="outline"
          onPress={() => {
            clearAuth();
            router.replace("/(auth)/login");
          }}
          style={{ marginTop: SPACING.lg }}
        />
      ) : (
        <Button
          title="Sign Out"
          variant="outline"
          onPress={() => void signOut().then(() => router.replace("/(auth)/login"))}
          style={{ marginTop: SPACING.lg }}
        />
      )}
    </Screen>
  );
}
