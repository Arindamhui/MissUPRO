import { useClerk, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { BrandLogo } from "@/components/BrandLogo";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Card, CoinDisplay, DiamondDisplay, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { router } from "expo-router";

export default function MeScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <Screen scroll style={{ backgroundColor: "transparent" }}>
        <View style={{ paddingTop: insets.top + 6, paddingBottom: SPACING.lg }}>
          <View style={{ alignItems: "center", paddingVertical: SPACING.lg }}>
            {authMode === "guest" ? <BrandLogo size={92} showWordmark={false} /> : <Avatar uri={user?.imageUrl ?? undefined} size={96} />}
            <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.white, marginTop: SPACING.md }}>
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || guestName || (userId ? "User" : "Guest")}
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
              <View style={{ backgroundColor: "rgba(160,211,255,0.16)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: "rgba(160,211,255,0.18)" }}>
                <Text style={{ color: "#D9EBFF", fontSize: 13, fontWeight: "700" }}>
                  {authMode === "guest" ? "Guest Access" : `Lv.${level.data?.level ?? 1}`}
                </Text>
              </View>
            </View>
          </View>

          <Card style={{ flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <TouchableOpacity onPress={() => router.push("/wallet")} style={{ alignItems: "center" }}>
              <CoinDisplay amount={coins} size="lg" />
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Coins</Text>
            </TouchableOpacity>
            <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.14)" }} />
            <TouchableOpacity onPress={() => router.push("/wallet")} style={{ alignItems: "center" }}>
              <DiamondDisplay amount={diamonds} size="lg" />
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Diamonds</Text>
            </TouchableOpacity>
          </Card>

          <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => router.push(item.route as any)}
                style={{
                  flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderBottomColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text style={{ fontSize: 22, marginRight: SPACING.md }}>{item.icon}</Text>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: COLORS.white }}>{item.label}</Text>
                <Text style={{ color: "rgba(255,255,255,0.5)" }}>›</Text>
              </TouchableOpacity>
            ))}
          </Card>

          {authMode === "guest" ? (
            <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Keep your progress</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Create a full account to sync balances, conversations, and creator activity across devices.</Text>
              <Button
                title="Sign In To Sync Progress"
                onPress={() => {
                  clearAuth();
                  router.replace("/(auth)/login");
                }}
                style={{ marginTop: SPACING.md }}
              />
            </Card>
          ) : (
            <Button
              title="Sign Out"
              variant="outline"
              onPress={() => void signOut().then(() => router.replace("/(auth)/login"))}
              style={{ marginTop: SPACING.lg, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.08)" }}
            />
          )}
        </View>
      </Screen>
    </View>
  );
}
