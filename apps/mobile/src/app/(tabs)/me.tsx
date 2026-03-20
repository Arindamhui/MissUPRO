import { useClerk, useUser } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Card, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { router } from "expo-router";

const TILE_META: Array<{ icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; route: string }> = [
  { icon: "cash-multiple", label: "Earnings", route: "/wallet" },
  { icon: "crown-outline", label: "Vip", route: "/vip" },
  { icon: "calendar-check-outline", label: "My Tasks", route: "/tasks" },
  { icon: "medal-outline", label: "My Badge", route: "/badges" },
  { icon: "storefront-outline", label: "Store", route: "/store" },
  { icon: "shopping-outline", label: "My Bag", route: "/bag" },
  { icon: "star-circle-outline", label: "My Level", route: "/levels" },
  { icon: "basket-outline", label: "My Market", route: "/market" },
  { icon: "account-group-outline", label: "My People", route: "/people" },
  { icon: "star-box-outline", label: "Collection", route: "/settings/effects" },
  { icon: "email-fast-outline", label: "My Invites", route: "/referrals" },
];

function DashboardTile({ icon, label, route }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; route: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ width: "25%", alignItems: "center", paddingVertical: 16 }}>
      <View style={{ width: 62, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(73,137,255,0.18)", borderWidth: 1, borderColor: "rgba(153,206,255,0.2)" }}>
        <MaterialCommunityIcons color="#F7FBFF" name={icon} size={30} />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 10, textAlign: "center" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const [momentsSheetOpen, setMomentsSheetOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const userId = useAuthStore((s) => s.userId);
  const authMode = useAuthStore((s) => s.authMode);
  const guestName = useAuthStore((s) => s.guestName);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const coins = useWalletStore((s) => s.coinBalance);
  const diamonds = useWalletStore((s) => s.diamondBalance);
  const isAuthenticated = authMode === "authenticated";
  const me = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const profile = trpc.user.getMyProfile.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const vip = trpc.vip.getMySubscription.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const followers = trpc.user.listFollowers.useQuery({ limit: 100 }, { retry: false, enabled: isAuthenticated });
  const following = trpc.user.listFollowing.useQuery({ limit: 100 }, { retry: false, enabled: isAuthenticated });
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const missuWorkspace = trpc.missu.getMyWorkspace.useQuery(undefined, { retry: false, enabled: isAuthenticated });

  const followerIds = useMemo(() => new Set((followers.data?.items ?? []).map((item: any) => String(item.userId ?? "")).filter(Boolean)), [followers.data?.items]);
  const followingList = (following.data?.items ?? []) as any[];
  const friendCount = followingList.filter((item) => followerIds.has(String(item.userId ?? ""))).length;
  const followerCount = Number(followers.data?.items?.length ?? 0);
  const followingCount = Number(followingList.length ?? 0);
  const coinBalance = Number(wallet.data?.coinBalance ?? coins ?? 0);
  const diamondBalance = Number(wallet.data?.diamondBalance ?? diamonds ?? 0);
  const displayName = String(profile.data?.displayName ?? me.data?.displayName ?? guestName ?? "Guest");
  const region = String(profile.data?.country ?? me.data?.country ?? "India");
  const profileId = String(me.data?.id ?? userId ?? "");
  const vipLabel = String(vip.data?.tierDetails?.name ?? vip.data?.tier ?? "VVIP");
  const roomManagementRoute = ["ADMIN", "HOST", "MODEL"].includes(String(me.data?.role ?? "")) ? "/agency/dashboard" : "/(tabs)/live";
  const publicUserId = String(missuWorkspace.data?.user?.publicUserId ?? profileId ?? "-");
  const hostId = String(missuWorkspace.data?.host?.hostId ?? "");
  const hostStatus = String(missuWorkspace.data?.host?.status ?? missuWorkspace.data?.latestHostApplication?.status ?? "NOT_STARTED");
  const avatarUri = String(
    profile.data?.avatarUrl
      ?? (profile.data as any)?.profileImage
      ?? me.data?.avatarUrl
      ?? (me.data as any)?.profileImage
      ?? user?.imageUrl
      ?? "",
  ) || undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <Screen scroll style={{ backgroundColor: "transparent" }}>
        <View style={{ paddingTop: insets.top + 6, paddingBottom: SPACING.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <TouchableOpacity onPress={() => router.push("/profile/edit")} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={COLORS.white} name="square-edit-outline" size={28} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/settings")} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={COLORS.white} name="cog-outline" size={28} />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: "center", paddingVertical: SPACING.sm }}>
            <Avatar uri={avatarUri} size={112} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.white, marginTop: SPACING.md }}>{displayName}</Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 10, fontSize: 16 }}>ID:{publicUserId}    {region}</Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
              <View style={{ backgroundColor: "#2AAE3D", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700" }}>Lv {Number(level.data?.level ?? 1)}</Text>
              </View>
              <View style={{ backgroundColor: "#FFD84C", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ color: "#9C2C73", fontSize: 13, fontWeight: "700" }}>0</Text>
              </View>
              <View style={{ backgroundColor: "rgba(79,227,255,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ color: "#92EFFF", fontSize: 13, fontWeight: "700" }}>{hostId ? `${hostId}` : hostStatus}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push("/host" as never)} style={{ marginBottom: 18, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(79,227,255,0.4)" }}>
            <LinearGradient colors={["rgba(79,227,255,0.25)", "rgba(39,70,160,0.25)"]} style={{ paddingHorizontal: 18, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>{hostId ? "Host Center" : "Become a Host"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 6, lineHeight: 20 }}>
                  {hostId ? `Current status: ${hostStatus}` : "Submit verification, choose platform or agency, and get your official MissU Host ID."}
                </Text>
              </View>
              <MaterialCommunityIcons color="#92EFFF" name="chevron-right" size={30} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 18 }}>
            {[
              { label: "Friends", value: friendCount, route: "/messages/friends" },
              { label: "Followers", value: followerCount, route: "/profile/followers" },
              { label: "Following", value: followingCount, route: "/profile/following" },
            ].map((item, index) => (
              <TouchableOpacity key={item.label} onPress={() => router.push(item.route as never)} style={{ flex: 1, alignItems: "center", borderRightWidth: index < 2 ? 1 : 0, borderRightColor: "rgba(255,255,255,0.16)" }}>
                <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800" }}>{item.value}</Text>
                <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 16, marginTop: 4 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 16, marginBottom: 18 }}>
            <TouchableOpacity onPress={() => router.push("/wallet")} style={{ flex: 1, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,225,157,0.42)" }}>
              <LinearGradient colors={["rgba(255,225,120,0.36)", "rgba(255,255,255,0.08)"]} style={{ padding: 18 }}>
                <Text style={{ color: "#FFB44C", fontSize: 18, fontWeight: "800" }}>Top up</Text>
                <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: 10 }}>{coinBalance}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/wallet")} style={{ flex: 1, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,145,239,0.42)" }}>
              <LinearGradient colors={["rgba(255,67,187,0.3)", "rgba(255,255,255,0.08)"]} style={{ padding: 18 }}>
                <Text style={{ color: "#FF67C9", fontSize: 18, fontWeight: "800" }}>Balance</Text>
                <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: 10 }}>{diamondBalance}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push("/vip")} style={{ marginBottom: 22, borderRadius: 22, overflow: "hidden" }}>
            <LinearGradient colors={["rgba(58,58,114,0.94)", "rgba(47,47,92,0.94)"]} style={{ paddingHorizontal: 20, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: COLORS.white, fontSize: 26, fontWeight: "900" }}>{vipLabel}</Text>
                <Text style={{ color: "#FFE7A4", fontSize: 16, fontWeight: "700", marginTop: 4 }}>CLAIM 5,401 EVERYDAY!</Text>
              </View>
              <View style={{ backgroundColor: "#FFE19C", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 }}>
                <Text style={{ color: "#563200", fontSize: 18, fontWeight: "800" }}>{vip.data?.tier ? "Active" : "Activate"}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Card style={{ backgroundColor: "rgba(76,53,135,0.5)", borderWidth: 0, borderRadius: 28 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {TILE_META.map((item) => <DashboardTile key={item.label} icon={item.icon} label={item.label} route={item.route} />)}
            </View>
          </Card>

          <Card style={{ backgroundColor: "rgba(76,53,135,0.5)", borderWidth: 0, borderRadius: 28 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <DashboardTile icon="account-group-outline" label="Room Mgmt" route="/room-management" />
              <DashboardTile icon="lifebuoy" label="Help&Support" route="/feedback" />
            </View>
          </Card>

          <View style={{ marginTop: 12 }}>
            <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginBottom: 14 }}>Moments</Text>
            <TouchableOpacity onPress={() => setMomentsSheetOpen(true)} style={{ width: 124, height: 124, borderRadius: 18, backgroundColor: "rgba(75,183,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color="rgba(255,255,255,0.86)" name="plus" size={48} />
            </TouchableOpacity>
            <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginTop: 20 }}>Status</Text>
            <TouchableOpacity onPress={() => router.push("/status" as never)} style={{ position: "absolute", right: 8, bottom: 0, width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(31,31,36,0.88)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color="#58C8FF" name="plus" size={38} />
            </TouchableOpacity>
          </View>

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

      <Modal transparent animationType="slide" visible={momentsSheetOpen} onRequestClose={() => setMomentsSheetOpen(false)}>
        <Pressable onPress={() => setMomentsSheetOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <Pressable style={{ backgroundColor: "#24222A", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 14, paddingBottom: 18 }}>
            {[
              { icon: "camera-outline", label: "Camera", route: "/moments" },
              { icon: "image-outline", label: "Choose photo from album", route: "/moments" },
              { icon: "video-outline", label: "Choose video from album", route: "/moments" },
              { icon: "plus-circle-outline", label: "Write poem", route: "/status" },
            ].map((item, index) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  setMomentsSheetOpen(false);
                  router.push(item.route as never);
                }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 22, borderBottomWidth: index < 3 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}
              >
                <MaterialCommunityIcons color={item.label === "Write poem" ? "#58D7FF" : COLORS.white} name={item.icon as never} size={27} />
                <Text style={{ color: item.label === "Write poem" ? "#58D7FF" : COLORS.white, fontSize: 18, marginLeft: 14 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setMomentsSheetOpen(false)} style={{ marginTop: 12, alignItems: "center", paddingVertical: 18, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18 }}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
