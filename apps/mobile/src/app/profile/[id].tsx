import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Button } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";
import { useAuthStore, useCallStore, useUIStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { SOCKET_EVENTS } from "@missu/types";

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function BadgePill({ label }: { label: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 14, marginTop: 8 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const { emit } = useSocket();

  const requestCall = trpc.calls.requestModelCall.useMutation();
  const followUser = trpc.user.followUser.useMutation();
  const unfollowUser = trpc.user.unfollowUser.useMutation();
  const profile = trpc.discovery.getModelCard.useQuery({ modelId: String(id ?? "") }, { retry: false, enabled: Boolean(id) && isAuthenticated });
  const me = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: isAuthenticated });

  const model = profile.data as any;
  const modelUserId = String(model?.userId ?? "");
  const isOwnProfile = Boolean(modelUserId && me.data?.id && String(me.data.id) === modelUserId);

  const isFollowing = trpc.user.isFollowing.useQuery({ targetUserId: modelUserId }, { retry: false, enabled: !!modelUserId && isAuthenticated && !isOwnProfile });
  const pricingPreview = trpc.calls.getCallPricingPreview.useQuery({ modelUserId }, { retry: false, enabled: !!modelUserId && isAuthenticated });
  const availability = trpc.user.getModelAvailability.useQuery({ modelUserId }, { retry: false, enabled: !!modelUserId && isAuthenticated });
  const reviews = trpc.user.getModelReviews.useQuery({ modelUserId, limit: 6 }, { retry: false, enabled: !!modelUserId && isAuthenticated });
  const demoVideos = trpc.user.getModelDemoVideos.useQuery({ modelUserId, status: "APPROVED" }, { retry: false, enabled: !!modelUserId && isAuthenticated });
  const squadOverview = trpc.agency.getMySquadOverview.useQuery(undefined, { retry: false, enabled: isAuthenticated && isOwnProfile });

  const reviewItems = (reviews.data?.items ?? []) as any[];
  const approvedVideos = (demoVideos.data ?? []) as any[];
  const availabilitySummary = availability.data as any;
  const preview = pricingPreview.data as any;
  const squad = squadOverview.data?.squad as any;

  const averageRating = useMemo(() => {
    if (model?.avgRating) return Number(model.avgRating);
    if (reviewItems.length === 0) return 0;
    return reviewItems.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviewItems.length;
  }, [model?.avgRating, reviewItems]);

  const isCallable = availabilitySummary?.availabilityStatus === "AVAILABLE_NOW";

  const startCall = (type: "audio" | "video") => {
    requestCall.mutate({ modelUserId, callType: type.toUpperCase() as "AUDIO" | "VIDEO" }, {
      onSuccess: (session: any) => {
        useCallStore.getState().startCall(session.id, type, modelUserId);
        emit(SOCKET_EVENTS.CALL.REQUEST, { targetUserId: modelUserId, callType: type, callSessionId: session.id });
        router.push(`/call/${session.id}` as never);
      },
      onError: (error: any) => Alert.alert("Unable to start call", error?.message ?? "Try again in a moment."),
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#071128", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Sign in required</Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", textAlign: "center", lineHeight: 22, marginTop: 10 }}>
          Profile data, calls, and follow state are account-based features.
        </Text>
        <Button title="Go to login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 18, width: "100%" }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#071128" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(122,170,255,0.2)", "rgba(9,16,36,0.62)", "#08111F"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 42 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push("/badges" as never)} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="dots-horizontal" size={24} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"]} style={{ borderRadius: 28, padding: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 138, height: 138, borderRadius: 69, borderWidth: 4, borderColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {model?.avatarUrl || model?.profileImage ? (
                <Image source={{ uri: model?.avatarUrl ?? model?.profileImage }} style={{ width: 128, height: 128, borderRadius: 64 }} />
              ) : (
                <View style={{ width: 128, height: 128, borderRadius: 64, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <Text style={{ color: COLORS.white, fontSize: 42, fontWeight: "900" }}>{String(model?.displayName ?? "M").slice(0, 1)}</Text>
                </View>
              )}
            </View>

            <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "300", marginTop: 14 }}>
              {String(model?.displayName ?? model?.username ?? "Profile")}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 18, marginTop: 2 }}>
              ID:{String(model?.userId ?? id ?? "")}{model?.country ? `  |  ${String(model.country)}` : ""}
            </Text>
            {model?.bio ? (
              <Text style={{ color: "rgba(255,255,255,0.88)", textAlign: "center", lineHeight: 24, marginTop: 16 }}>
                {String(model.bio)}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
              <BadgePill label={`Lv${Number(model?.level ?? 1)}`} />
              {averageRating > 0 ? <BadgePill label={`${averageRating.toFixed(1)}★`} /> : null}
              {model?.isOnline ? <BadgePill label="Live" /> : null}
              {availabilitySummary?.availabilityStatus ? <BadgePill label={String(availabilitySummary.availabilityStatus).replaceAll("_", " ")} /> : null}
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28 }}>
            <StatColumn label="Friends" value={formatCompact(Number(model?.friendCount ?? 0))} />
            <StatColumn label="Followers" value={formatCompact(Number(model?.followerCount ?? 0))} />
            <StatColumn label="Following" value={formatCompact(Number(model?.followingCount ?? 0))} />
          </View>

          <View style={{ borderRadius: 22, backgroundColor: "rgba(123,176,255,0.18)", padding: 14, marginTop: 22, flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <MaterialCommunityIcons color="#FFE082" name="shield-crown-outline" size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{String(squad?.agencyName ?? model?.agencyName ?? "No squad attached")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }} numberOfLines={1}>
                {squad ? `${Number(squad.memberCount ?? 0)} members · ${Number(squad.onlineCount ?? 0)} active · ${Number(squad.prestigePoints ?? 0)} prestige` : "Join or create a squad to unlock social progression."}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/discover" as never)}>
              <MaterialCommunityIcons color={COLORS.white} name="chevron-right" size={26} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 22 }}>
            {!isOwnProfile ? (
              <TouchableOpacity activeOpacity={0.92} onPress={() => {
                const action = isFollowing.data?.isFollowing ? unfollowUser : followUser;
                action.mutate({ targetUserId: modelUserId }, { onSuccess: () => { void isFollowing.refetch(); void profile.refetch(); } });
              }} style={{ flex: 1 }}>
                <LinearGradient colors={["#F455D4", "#5DD3FF"]} style={{ borderRadius: 999, paddingVertical: 18, alignItems: "center" }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }}>{isFollowing.data?.isFollowing ? "Following" : "+ Follow"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => router.push(`/chat/${modelUserId}?recipientId=${modelUserId}` as never)} style={{ flex: 1, borderRadius: 999, borderWidth: 2, borderColor: "#6FDBFF", paddingVertical: 18, alignItems: "center" }}>
              <Text style={{ color: "#8AE7FF", fontSize: 18, fontWeight: "900" }}>Chat</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={{ borderRadius: 24, backgroundColor: "rgba(255,255,255,0.06)", padding: 18, marginTop: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Moments</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 16 }}>
            {approvedVideos.length > 0 ? approvedVideos.slice(0, 4).map((video) => (
              <View key={String(video.id)} style={{ width: "48%", height: 118, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 34 }}>🎬</Text>
                <Text style={{ color: COLORS.white, fontWeight: "700", marginTop: 8 }} numberOfLines={1}>{String(video.title ?? "Moment")}</Text>
              </View>
            )) : [0, 1, 2, 3].map((slot) => (
              <View key={slot} style={{ width: "48%", height: 118, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
            ))}
          </View>
        </View>

        <View style={{ borderRadius: 24, backgroundColor: "rgba(255,255,255,0.06)", padding: 18, marginTop: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Call and gifting</Text>
          <Text style={{ color: "rgba(255,255,255,0.66)", lineHeight: 21, marginTop: 8 }}>
            Audio/video call pricing, live gifting, and minimum balance rules are all loaded from the backend so this surface stays in sync with admin controls.
          </Text>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <TouchableOpacity onPress={() => startCall("audio")} disabled={!isCallable || requestCall.isPending || preview?.canStartAudio === false} style={{ flex: 1, borderRadius: 18, paddingVertical: 16, backgroundColor: isCallable ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontWeight: "900" }}>Audio {Number(preview?.audioCoinsPerMinute ?? model?.audioPrice ?? 30)}/m</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startCall("video")} disabled={!isCallable || requestCall.isPending || preview?.canStartVideo === false} style={{ flex: 1, borderRadius: 18, paddingVertical: 16, backgroundColor: isCallable ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontWeight: "900" }}>Video {Number(preview?.videoCoinsPerMinute ?? model?.videoPrice ?? 50)}/m</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => {
            useUIStore.getState().openGiftDrawer({ userId: modelUserId, context: "profile" });
            router.push("/gifts" as never);
          }} style={{ borderRadius: 18, backgroundColor: "rgba(255,103,180,0.18)", paddingVertical: 15, alignItems: "center", marginTop: 12 }}>
            <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 16 }}>Send Gift</Text>
          </TouchableOpacity>
        </View>

        <View style={{ borderRadius: 24, backgroundColor: "rgba(255,255,255,0.06)", padding: 18, marginTop: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Reviews</Text>
          <View style={{ marginTop: 14 }}>
            {reviewItems.length > 0 ? reviewItems.map((review) => (
              <View key={String(review.id)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: COLORS.white, fontWeight: "800" }}>{Number(review.rating ?? 0).toFixed(1)} / 5</Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 6, lineHeight: 20 }}>{String(review.reviewText ?? "No written review provided.")}</Text>
              </View>
            )) : (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>No reviews yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}