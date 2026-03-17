import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { DynamicHomeLayout } from "@/components/dynamic-layout";
import { Button, Card } from "@/components/ui";
import { getMobileLayoutScope } from "@/lib/runtime-config";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";

type HomeCategory = "Freshers" | "Popular" | "Spotlight" | "Party" | "PK Matches";

type TalentCard = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: string;
  viewersLabel: string;
  imageUri?: string | null;
  route: string;
};

type PartyTile = {
  id: string;
  title: string;
  colors: [string, string];
  icon: string;
  route: string;
};

type PkCard = {
  id: string;
  title: string;
  subtitle: string;
  country: string;
  status: string;
  route: string;
  imageUri?: string | null;
};

const HOME_CATEGORIES: HomeCategory[] = ["Freshers", "Popular", "Spotlight", "Party", "PK Matches"];

const PARTY_TILES: PartyTile[] = [
  { id: "ludo", title: "Ludo", colors: ["#7B3BFF", "#40358C"], icon: "🎲", route: "/games" },
  { id: "chess", title: "Chess", colors: ["#AAB4D8", "#596387"], icon: "♟️", route: "/games" },
  { id: "carrom", title: "Carrom", colors: ["#FF6B6B", "#8F2E37"], icon: "🎯", route: "/games" },
  { id: "sudoku", title: "Sudoku", colors: ["#4DBD98", "#20645C"], icon: "🔢", route: "/games" },
  { id: "more-games", title: "More Games", colors: ["#8151FF", "#2C3476"], icon: "✨", route: "/games" },
];

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return `${value}`;
}

function BadgePill({ label, backgroundColor, textColor = "#FFFFFF" }: { label: string; backgroundColor: string; textColor?: string }) {
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: textColor, fontSize: 11, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function SectionHeading({ title, actionLabel, onPress }: { title: string; actionLabel?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 5, height: 28, borderRadius: 999, backgroundColor: "#4FE3FF", marginRight: 10 }} />
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>{title}</Text>
      </View>
      {actionLabel && onPress ? (
        <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "700" }}>{actionLabel}</Text>
          <MaterialCommunityIcons color="rgba(255,255,255,0.78)" name="chevron-right" size={18} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SearchHeader() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <TouchableOpacity onPress={() => router.push("/leaderboards")} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 26 }}>🏆</Text>
      </TouchableOpacity>
      <Pressable
        onPress={() => router.push("/discover")}
        style={{
          flex: 1,
          marginHorizontal: 10,
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
          paddingHorizontal: 14,
          paddingVertical: 11,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <MaterialCommunityIcons color="rgba(255,255,255,0.82)" name="magnify" size={22} />
        <Text style={{ color: "rgba(255,255,255,0.72)", marginLeft: 8, fontSize: 16 }}>Search ID</Text>
      </Pressable>
      <TouchableOpacity
        onPress={() => router.push("/me")}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <MaterialCommunityIcons color="#FFFFFF" name="emoticon-happy-outline" size={22} />
      </TouchableOpacity>
    </View>
  );
}

function TalentGridCard({ item }: { item: TalentCard }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(item.route as never)}
      style={{ width: "48.5%", marginBottom: 12, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <ImageBackground source={item.imageUri ? { uri: item.imageUri } : undefined} style={{ height: 238, justifyContent: "space-between", backgroundColor: "#222A63" }}>
        <LinearGradient colors={["rgba(10,15,44,0.04)", "rgba(10,15,44,0.82)"]} style={{ flex: 1, justifyContent: "space-between", padding: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <BadgePill label={item.badge} backgroundColor={item.badgeTone} />
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "800" }}>{item.viewersLabel}</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 11, marginTop: 4 }} numberOfLines={1}>{item.subtitle}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function EditorPickCard({ item }: { item: TalentCard }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={() => router.push(item.route as never)} style={{ width: 168, marginRight: 12 }}>
      <ImageBackground source={item.imageUri ? { uri: item.imageUri } : undefined} style={{ height: 140, borderRadius: 18, overflow: "hidden", justifyContent: "space-between", backgroundColor: "#1D255D" }}>
        <LinearGradient colors={["rgba(11,14,44,0.08)", "rgba(11,14,44,0.84)"]} style={{ flex: 1, padding: 10, justifyContent: "space-between" }}>
          <BadgePill label={item.badge} backgroundColor={item.badgeTone} />
          <View>
            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "800" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.subtitle}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function EventHero({ title, subtitle, imageUri, onPress }: { title: string; subtitle: string; imageUri?: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={{ marginBottom: 14, borderRadius: 18, overflow: "hidden" }}>
      <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={{ height: 126, backgroundColor: "#5161E8" }}>
        <LinearGradient colors={["rgba(83,95,243,0.3)", "rgba(14,16,45,0.35)"]} style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
          <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", lineHeight: 38 }}>{title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, fontWeight: "700" }}>{subtitle}</Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function PartyGameTile({ tile, compact }: { tile: PartyTile; compact?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(tile.route as never)}
      style={{
        flex: compact ? 1 : undefined,
        width: compact ? undefined : "56%",
        height: compact ? 102 : 214,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <LinearGradient colors={tile.colors} style={{ flex: 1, padding: compact ? 14 : 18, justifyContent: "space-between" }}>
        <Text style={{ fontSize: compact ? 30 : 52 }}>{tile.icon}</Text>
        <Text style={{ color: COLORS.white, fontSize: compact ? 18 : 30, fontWeight: "900" }}>{tile.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PartyListCard({ title, subtitle, meta, imageUri, onPress }: { title: string; subtitle: string; meta: string; imageUri?: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={{ marginBottom: 12, borderRadius: 18, overflow: "hidden" }}>
      <LinearGradient colors={["rgba(112,76,214,0.92)", "rgba(36,45,103,0.96)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "stretch", minHeight: 110, borderWidth: 1, borderColor: "rgba(116,214,255,0.28)" }}>
        <ImageBackground source={imageUri ? { uri: imageUri } : undefined} style={{ width: 112, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <View style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }} numberOfLines={1}>{title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 13 }} numberOfLines={2}>{subtitle}</Text>
          <Text style={{ color: "#6EEBFF", fontSize: 13, fontWeight: "800" }}>{meta}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function PkMatchCard({ item }: { item: PkCard }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={() => router.push(item.route as never)} style={{ marginBottom: 14, borderRadius: 20, overflow: "hidden" }}>
      <LinearGradient colors={["rgba(92,62,175,0.95)", "rgba(20,30,72,0.98)"]} style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", padding: 16, flexDirection: "row", alignItems: "center" }}>
        <ImageBackground source={item.imageUri ? { uri: item.imageUri } : undefined} style={{ width: 58, height: 58, borderRadius: 29, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.1)", marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }} numberOfLines={1}>{item.title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 13, marginTop: 4 }} numberOfLines={1}>{item.subtitle} | {item.country}</Text>
          <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 4 }} numberOfLines={1}>PK crucial, need a hand!</Text>
        </View>
        <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.09)", paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "700" }}>{item.status}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function CuratedHomeFeed({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeCategory, setActiveCategory] = useState<HomeCategory>("Freshers");
  const [pkMode, setPkMode] = useState<"Matches" | "Super League">("Matches");
  const bannerQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });
  const liveQuery = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const recommendedQuery = trpc.discovery.getModelRecommendations.useQuery({ limit: 8 }, { retry: false, enabled: isAuthenticated });
  const eventConfigsQuery = trpc.config.listEventConfigs.useQuery(undefined, { retry: false });
  const partyConfigsQuery = trpc.config.listPartyRoomConfigs.useQuery(undefined, { retry: false });
  const eventsQuery = trpc.events.listEvents.useQuery({ limit: 6 }, { retry: false, enabled: isAuthenticated });
  const partyRoomsQuery = trpc.party.listActiveRooms.useQuery({ limit: 5 }, { retry: false, enabled: isAuthenticated });
  const pkBattlesQuery = trpc.pk.myBattles.useQuery({ statuses: ["CREATED", "MATCHING", "ACTIVE"], limit: 8 }, { retry: false, enabled: isAuthenticated });

  const recommended = (recommendedQuery.data ?? []) as any[];
  const liveStreams = (liveQuery.data?.streams ?? []) as any[];
  const banners = (bannerQuery.data ?? []) as any[];
  const eventConfigs = (eventConfigsQuery.data ?? []) as any[];
  const partyConfigs = (partyConfigsQuery.data ?? []) as any[];
  const activeEvents = ((eventsQuery.data?.items ?? []) as any[]).filter((event) => ["ACTIVE", "UPCOMING"].includes(String(event.status)));
  const activePartyRooms = (partyRoomsQuery.data?.items ?? []) as any[];
  const myBattles = (pkBattlesQuery.data?.items ?? []) as any[];

  const openBanner = (banner: any) => {
    const target = String(banner.linkTarget ?? "");
    if (!target) return;
    if (banner.linkType === "MODEL_PROFILE") {
      router.push(`/profile/${target}` as never);
      return;
    }
    if (target.startsWith("/")) {
      router.push(target as never);
    }
  };

  const getBannerRoute = (banner: any) => {
    const target = String(banner.linkTarget ?? "");
    if (!target) return "/discover";
    if (banner.linkType === "MODEL_PROFILE") {
      return `/profile/${target}`;
    }
    return target.startsWith("/") ? target : "/discover";
  };

  const talentCards = useMemo<TalentCard[]>(() => {
    const recommendedCards = recommended.map((model, index) => ({
      id: `model-${String(model.userId ?? model.modelId ?? index)}`,
      title: String(model.displayName ?? "Creator"),
      subtitle: String(model.tagline ?? model.primaryCategory ?? "Live talent"),
      badge: index % 3 === 0 ? "New Star" : index % 3 === 1 ? "Rising Star" : "Super Star",
      badgeTone: index % 3 === 0 ? "#4BE7E0" : index % 3 === 1 ? "#4FA0FF" : "#B35CFF",
      viewersLabel: formatCompactCount(Math.max(120, Math.round(Number(model.qualityScore ?? 1) * 800))),
      imageUri: model.avatarUrl ?? null,
      route: `/profile/${String(model.userId ?? model.modelId)}`,
    }));
    const liveCards = liveStreams.map((stream, index) => ({
      id: `live-${String(stream.streamId ?? index)}`,
      title: String(stream.displayName ?? stream.hostDisplayName ?? stream.title ?? "Live Room"),
      subtitle: String(stream.title ?? stream.category ?? "Live"),
      badge: index % 2 === 0 ? "PK" : "New Star",
      badgeTone: index % 2 === 0 ? "#2A276D" : "#4BE7E0",
      viewersLabel: formatCompactCount(Number(stream.viewerCount ?? 0)),
      imageUri: stream.coverImageUrl ?? stream.avatarUrl ?? null,
      route: `/stream/${String(stream.streamId)}`,
    }));
    return [...recommendedCards, ...liveCards].slice(0, 10);
  }, [liveStreams, recommended]);

  const editorPicks = useMemo<TalentCard[]>(() => {
    return (banners.length > 0
      ? banners.slice(0, 3).map((banner: any, index: number) => ({
          id: `banner-${String(banner.id ?? index)}`,
          title: String(banner.title ?? "Editor's Pick"),
          subtitle: String(banner.subtitle ?? banner.description ?? "Featured campaign"),
          badge: index === 0 ? "Dancing" : index === 1 ? "Premiere" : "Sing",
          badgeTone: index === 0 ? "#9144FF" : index === 1 ? "#FFB22C" : "#FFB22C",
          viewersLabel: "Top",
          imageUri: banner.imageUrl ?? null,
          route: getBannerRoute(banner),
        }))
      : talentCards.slice(0, 3));
  }, [banners, talentCards]);

  const partyList = useMemo(() => {
    if (activePartyRooms.length > 0) {
      return activePartyRooms.map((room, index) => ({
        id: String(room.id ?? index),
        title: String(room.roomName ?? room.hostName ?? "Party Room"),
        subtitle: `${String(room.hostName ?? "Host")} is live with friends`,
        meta: `${Number(room.maxSeats ?? 8)} seats open`,
        imageUri: room.hostAvatar ?? null,
        route: `/party/${String(room.id)}`,
      }));
    }

    return eventConfigs.slice(0, 3).map((config, index) => ({
      id: `event-config-${index}`,
      title: String(config.displayName ?? config.configKey ?? "Party Event"),
      subtitle: String(config.description ?? "Admin scheduled party event"),
      meta: "Tap to view schedule",
      imageUri: banners[index]?.imageUrl ?? null,
      route: "/events",
    }));
  }, [activePartyRooms, banners, eventConfigs]);

  const pkCards = useMemo<PkCard[]>(() => {
    if (myBattles.length > 0) {
      return myBattles.map((battle, index) => ({
        id: String(battle.id ?? battle.pkSessionId ?? index),
        title: String(battle.opponentName ?? battle.title ?? `PK Match ${index + 1}`),
        subtitle: `ID: ${String(battle.pkSessionId ?? battle.id ?? "match").slice(0, 8)}`,
        country: String(battle.regionCode ?? "Global"),
        status: String(battle.status ?? "ACTIVE"),
        route: battle.pkSessionId ? `/pk/battle?sessionId=${String(battle.pkSessionId)}` : "/pk/results",
        imageUri: battle.opponentAvatarUrl ?? null,
      }));
    }

    return liveStreams.slice(0, 6).map((stream, index) => ({
      id: `pk-fallback-${String(stream.streamId ?? index)}`,
      title: String(stream.displayName ?? stream.hostDisplayName ?? `Host ${index + 1}`),
      subtitle: `ID: ${String(stream.hostUserId ?? stream.streamId ?? index).slice(0, 10)}`,
      country: String(stream.regionCode ?? (index % 2 === 0 ? "India" : "Pakistan")),
      status: index % 3 === 0 ? "LIVE" : "Offline",
      route: stream.streamId ? `/stream/${String(stream.streamId)}` : "/pk/results",
      imageUri: stream.avatarUrl ?? null,
    }));
  }, [liveStreams, myBattles]);

  const featuredEvent = activeEvents[0] ?? eventConfigs[0] ?? banners[0];
  const featuredPartyConfig = partyConfigs[0];
  const isLoading = liveQuery.isLoading || bannerQuery.isLoading || (isAuthenticated && recommendedQuery.isLoading);

  const renderFreshers = () => (
    <>
      <SectionHeading title="New Star" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {talentCards.slice(0, 6).map((item) => <TalentGridCard key={item.id} item={item} />)}
      </View>
    </>
  );

  const renderPopular = () => (
    <>
      {banners.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {banners.slice(0, 4).map((banner) => (
            <TouchableOpacity key={String(banner.id)} activeOpacity={0.92} onPress={() => openBanner(banner)} style={{ width: 308, height: 132, borderRadius: 18, overflow: "hidden", marginRight: 12 }}>
              <ImageBackground source={banner.imageUrl ? { uri: banner.imageUrl } : undefined} style={{ flex: 1, backgroundColor: "#2B3577" }}>
                <LinearGradient colors={["rgba(16,17,52,0.1)", "rgba(16,17,52,0.8)"]} style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
                  <BadgePill label="Featured" backgroundColor="#FFBE2E" textColor="#3F2400" />
                  <View>
                    <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }} numberOfLines={2}>{String(banner.title ?? "Campaign")}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 }}>Tap to open</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      <SectionHeading title="Popular Rooms" actionLabel="More" onPress={() => router.push("/discover")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {talentCards.slice(0, 8).map((item) => <TalentGridCard key={item.id} item={item} />)}
      </View>
    </>
  );

  const renderSpotlight = () => (
    <>
      <SectionHeading title="Editor's Pick" actionLabel="More" onPress={() => router.push("/discover")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {editorPicks.map((item) => <EditorPickCard key={item.id} item={item} />)}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <SectionHeading title="Spotlight Talent" />
        <TouchableOpacity onPress={() => router.push("/discover")} style={{ borderRadius: 999, backgroundColor: "#FF8A2E", paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "900" }}>Join Spotlight</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {talentCards.slice(0, 4).map((item) => <TalentGridCard key={item.id} item={item} />)}
      </View>
    </>
  );

  const renderParty = () => (
    <>
      <EventHero
        title={String(featuredEvent?.title ?? featuredEvent?.displayName ?? "Event Schedule")}
        subtitle={String(featuredEvent?.description ?? featuredPartyConfig?.description ?? "Seasonal room events and games")}
        imageUri={featuredEvent?.imageUrl ?? banners[0]?.imageUrl ?? null}
        onPress={() => router.push("/events")}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
        <PartyGameTile tile={PARTY_TILES[0]!} />
        <View style={{ width: "41%", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <PartyGameTile tile={PARTY_TILES[1]!} compact />
            <View style={{ width: 10 }} />
            <PartyGameTile tile={PARTY_TILES[2]!} compact />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <PartyGameTile tile={PARTY_TILES[3]!} compact />
            <View style={{ width: 10 }} />
            <PartyGameTile tile={PARTY_TILES[4]!} compact />
          </View>
        </View>
      </View>

      <SectionHeading title="Party Rooms" actionLabel="More" onPress={() => router.push("/events")} />
      {partyList.length > 0 ? (
        partyList.map((item) => (
          <PartyListCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            meta={item.meta}
            imageUri={item.imageUri}
            onPress={() => router.push(item.route as never)}
          />
        ))
      ) : (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>No party rooms are open right now</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>Tap into events or games while the next room fills up.</Text>
        </Card>
      )}
    </>
  );

  const renderPk = () => (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, padding: 4, flex: 1, marginRight: 12 }}>
          {["Matches", "Super League"].map((item) => {
            const selected = pkMode === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setPkMode(item as "Matches" | "Super League")}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 10,
                  backgroundColor: selected ? "#63D8FF" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: selected ? "#102047" : "rgba(255,255,255,0.72)", fontWeight: "800" }}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={() => router.push("/pk/results")} style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(255,230,162,0.18)", borderWidth: 1, borderColor: "rgba(255,230,162,0.28)" }}>
          <Text style={{ color: COLORS.white, fontWeight: "800" }}>🏆 Rule</Text>
        </TouchableOpacity>
      </View>

      {pkCards.length > 0 ? pkCards.map((item) => <PkMatchCard key={item.id} item={item} />) : null}
    </>
  );

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {HOME_CATEGORIES.map((section) => {
          const selected = activeCategory === section;
          return (
            <TouchableOpacity key={section} onPress={() => setActiveCategory(section)} style={{ marginRight: 22, paddingBottom: 6 }}>
              <Text style={{ color: selected ? COLORS.white : "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: selected ? "900" : "500" }}>{section}</Text>
              {selected ? <View style={{ marginTop: 6, width: 48, height: 6, borderRadius: 999, backgroundColor: "#63D8FF" }} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.xl }} /> : null}

      {!isLoading && activeCategory === "Freshers" ? renderFreshers() : null}
      {!isLoading && activeCategory === "Popular" ? renderPopular() : null}
      {!isLoading && activeCategory === "Spotlight" ? renderSpotlight() : null}
      {!isLoading && activeCategory === "Party" ? renderParty() : null}
      {!isLoading && activeCategory === "PK Matches" ? renderPk() : null}

      {!isAuthenticated && (activeCategory === "Party" || activeCategory === "PK Matches") ? (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.09)", borderColor: "rgba(255,255,255,0.1)", marginTop: 10 }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }}>Sign in for live joins and battle actions</Text>
          <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 8, lineHeight: 20 }}>
            Browsing stays open in guest mode, but joining events, party rooms, and PK actions still require an account.
          </Text>
          <Button title="Sign In" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 14, backgroundColor: COLORS.white }} variant="secondary" />
        </Card>
      ) : null}
    </>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const layoutQuery = trpc.config.getUILayout.useQuery({ layoutKey: "home_feed", ...getMobileLayoutScope() }, { retry: false });
  const dynamicSectionCount = Object.keys(layoutQuery.data?.sections ?? {}).length;
  const isAuthenticated = authMode === "authenticated";

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(18,21,71,0.18)", "rgba(10,18,60,0.74)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={20} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: SPACING.md, paddingBottom: 124 }}>
        <SearchHeader />
        <CuratedHomeFeed isAuthenticated={isAuthenticated} />

        {dynamicSectionCount > 0 ? (
          <View style={{ marginTop: 18 }}>
            <SectionHeading title="For You" />
            <DynamicHomeLayout config={layoutQuery.data} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
