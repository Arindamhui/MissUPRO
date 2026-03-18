import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS } from "@/theme";

type SocialStudioMode = "moments" | "status";

type FeedBanner = {
  id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkTarget?: string | null;
};

type LivePreview = {
  streamId?: string | null;
  title?: string | null;
  displayName?: string | null;
  coverImageUrl?: string | null;
  avatarUrl?: string | null;
  viewers?: number | null;
};

type PosterCard = {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  route: string;
};

type StatusCard = {
  id: string;
  title: string;
  route: string;
  colorA: string;
  colorB: string;
};

function toHashtag(value: string) {
  return `#${value.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 14) || "MissUPro"}`;
}

function PosterTile({ item }: { item: PosterCard }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(item.route as never)}
      style={{
        width: 186,
        height: 230,
        marginRight: 14,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <LinearGradient colors={["rgba(90,163,255,0.34)", "rgba(17,25,78,0.98)"]} style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" }}>{item.subtitle}</Text>
          <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 11, marginTop: 6 }}>{item.caption}</Text>
        </View>
        <View>
          <Text numberOfLines={3} style={{ color: COLORS.white, fontSize: 27, fontWeight: "900", lineHeight: 30 }}>
            {item.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <MaterialCommunityIcons color="#77D5FF" name="play-circle-outline" size={20} />
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginLeft: 6 }}>Open</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function StatusTile({ item }: { item: StatusCard }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(item.route as never)}
      style={{ width: "31.5%", aspectRatio: 1, borderRadius: 18, overflow: "hidden", marginBottom: 10 }}
    >
      <LinearGradient colors={[item.colorA, item.colorB]} style={{ flex: 1, justifyContent: "flex-end", padding: 12 }}>
        <Text numberOfLines={3} style={{ color: COLORS.white, fontSize: 18, fontWeight: "900", lineHeight: 20 }}>
          {item.title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SocialStudioScreen({ mode }: { mode: SocialStudioMode }) {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";

  const meQuery = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const bannersQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });
  const liveQuery = trpc.live.activeStreams.useQuery(undefined, { retry: false });

  const roomManagementRoute = ["ADMIN", "HOST", "MODEL"].includes(String(meQuery.data?.role ?? "")) ? "/agency/dashboard" : "/(tabs)/live";
  const banners = (bannersQuery.data ?? []) as FeedBanner[];
  const liveStreams = ((liveQuery.data?.streams ?? []) as LivePreview[]);

  const posters = useMemo<PosterCard[]>(() => {
    const bannerCards = banners.slice(0, 4).map((banner, index) => ({
      id: `banner-${banner.id ?? index}`,
      title: String(banner.title ?? "Featured moment"),
      subtitle: String(banner.subtitle ?? "Campaign spotlight"),
      caption: index % 2 === 0 ? "Featured now" : "Trending collection",
      route: String(banner.linkTarget ?? "/leaderboards").startsWith("/") ? String(banner.linkTarget) : "/leaderboards",
    }));
    const streamCards = liveStreams.slice(0, 4).map((stream, index) => ({
      id: `stream-${stream.streamId ?? index}`,
      title: String(stream.title ?? stream.displayName ?? "Live moment"),
      subtitle: String(stream.displayName ?? "Live creator"),
      caption: `${Math.max(1, Number(stream.viewers ?? index + 1))} viewers`,
      route: `/stream/${String(stream.streamId)}`,
    }));

    return [...bannerCards, ...streamCards];
  }, [banners, liveStreams]);

  const statusCards = useMemo<StatusCard[]>(() => {
    const bannerStatuses = banners.slice(0, 6).map((banner, index) => ({
      id: `status-banner-${banner.id ?? index}`,
      title: toHashtag(String(banner.title ?? banner.subtitle ?? `Status ${index + 1}`)),
      route: String(banner.linkTarget ?? "/leaderboards").startsWith("/") ? String(banner.linkTarget) : "/leaderboards",
      colorA: ["#F38AA9", "#3D5BC5", "#A64CC8", "#FF9848"][index % 4]!,
      colorB: ["#FFE2EC", "#101D59", "#4E2A8F", "#6A2E17"][index % 4]!,
    }));
    const streamStatuses = liveStreams.slice(0, 6).map((stream, index) => ({
      id: `status-live-${stream.streamId ?? index}`,
      title: toHashtag(String(stream.title ?? stream.displayName ?? `Live ${index + 1}`)),
      route: `/stream/${String(stream.streamId)}`,
      colorA: ["#3BA4FF", "#A17CFF", "#FF7D79"][index % 3]!,
      colorB: ["#10295D", "#43267A", "#6D1414"][index % 3]!,
    }));

    return [...bannerStatuses, ...streamStatuses];
  }, [banners, liveStreams]);

  const isLoading = (bannersQuery.isLoading || liveQuery.isLoading) && posters.length === 0 && statusCards.length === 0;
  const hasError = Boolean(bannersQuery.error || liveQuery.error);
  const title = mode === "moments" ? "Moments" : "Status";
  const subtitle = mode === "moments"
    ? "Featured campaigns and live highlights land here so this section stays connected to real backend activity."
    : "Status picks are pulled from public campaigns and active streams so the feed remains live and navigable.";

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 34 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>{title}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/discover" as never)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(88,200,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color="#58C8FF" name="compass-outline" size={22} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["rgba(108,86,255,0.44)", "rgba(45,185,255,0.22)"]} style={{ marginTop: 18, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
          <Text style={{ color: COLORS.white, fontSize: 29, fontWeight: "900" }}>{title} Studio</Text>
          <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 14, lineHeight: 20, marginTop: 10 }}>{subtitle}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <TouchableOpacity onPress={() => router.push(roomManagementRoute as never)} style={{ flex: 1 }} activeOpacity={0.92}>
              <LinearGradient colors={["#7E95FF", "#4AC5FF"]} style={{ borderRadius: 20, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>Go Live</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/discover" as never)} style={{ flex: 1 }} activeOpacity={0.92}>
              <View style={{ borderRadius: 20, paddingVertical: 14, alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>Open Discover</Text>
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {isLoading ? (
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <ActivityIndicator color="#7FD1FF" size="large" />
            <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 12 }}>Loading live activity...</Text>
          </View>
        ) : null}

        {!isLoading && hasError && posters.length === 0 && statusCards.length === 0 ? (
          <View style={{ marginTop: 22, borderRadius: 24, padding: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Unable to load {title.toLowerCase()}</Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 14, lineHeight: 20, marginTop: 8 }}>The live feed or campaign surface is unavailable right now. Retry or continue from Discover.</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => {
                void bannersQuery.refetch();
                void liveQuery.refetch();
              }}
              style={{ marginTop: 14, alignSelf: "flex-start" }}
            >
              <LinearGradient colors={["#7E95FF", "#4AC5FF"]} style={{ borderRadius: 18, paddingHorizontal: 18, paddingVertical: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "800" }}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null}

        {mode === "moments" ? (
          <>
            <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.white, fontSize: 21, fontWeight: "900" }}>Featured Moments</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{posters.length} live items</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14, paddingBottom: 4 }}>
              {posters.map((item) => <PosterTile key={item.id} item={item} />)}
            </ScrollView>

            <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.white, fontSize: 21, fontWeight: "900" }}>Quick Status Picks</Text>
              <TouchableOpacity activeOpacity={0.92} onPress={() => router.push("/status" as never)}>
                <Text style={{ color: "#7FD1FF", fontSize: 13, fontWeight: "800" }}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 14 }}>
              {statusCards.slice(0, 6).map((item) => <StatusTile key={item.id} item={item} />)}
            </View>
          </>
        ) : (
          <>
            <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.white, fontSize: 21, fontWeight: "900" }}>Live Status Board</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{statusCards.length} cards</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 14 }}>
              {statusCards.map((item) => <StatusTile key={item.id} item={item} />)}
            </View>

            <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.white, fontSize: 21, fontWeight: "900" }}>Featured Rooms</Text>
              <TouchableOpacity activeOpacity={0.92} onPress={() => router.push(roomManagementRoute as never)}>
                <Text style={{ color: "#7FD1FF", fontSize: 13, fontWeight: "800" }}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 14 }}>
              {posters.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.92}
                  onPress={() => router.push(item.route as never)}
                  style={{
                    marginBottom: 12,
                    borderRadius: 22,
                    padding: 16,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, marginTop: 5 }} numberOfLines={1}>{item.subtitle} • {item.caption}</Text>
                  </View>
                  <MaterialCommunityIcons color="#7FD1FF" name="chevron-right" size={28} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}