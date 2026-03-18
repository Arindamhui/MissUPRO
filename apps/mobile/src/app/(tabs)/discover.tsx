import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS } from "@/theme";

type HubMode = "shorts" | "status" | "squad";
type StatusMode = "hot" | "new" | "followed";
type SquadMode = "popular" | "my" | "rank";

type PosterItem = {
  id: string;
  title: string;
  subtitle: string;
  caption: string;
  imageUrl?: string | null;
  route: string;
};

type StatusItem = {
  id: string;
  title: string;
  colorA: string;
  colorB: string;
  route?: string;
};

type SquadItem = {
  id: string;
  agencyName: string;
  country: string;
  emblemUrl?: string | null;
  description: string;
  memberCount: number;
  onlineCount: number;
  prestigePoints: number;
  tags: string[];
  rank: number;
};

const MODE_LABELS: Array<{ key: HubMode; label: string }> = [
  { key: "shorts", label: "Shorts" },
  { key: "status", label: "Status" },
  { key: "squad", label: "Squad" },
];

const STATUS_LABELS: Array<{ key: StatusMode; label: string }> = [
  { key: "hot", label: "Hot" },
  { key: "new", label: "New" },
  { key: "followed", label: "Followed" },
];

const SQUAD_LABELS: Array<{ key: SquadMode; label: string }> = [
  { key: "popular", label: "Popular" },
  { key: "my", label: "My Squad" },
  { key: "rank", label: "Rank" },
];

function toHashtag(value: string) {
  return `#${value.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 14) || "MissUPro"}`;
}

function HeaderTabs({ value, onChange }: { value: HubMode; onChange: (value: HubMode) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 28, paddingHorizontal: 22, marginTop: 8 }}>
      {MODE_LABELS.map((item) => {
        const active = item.key === value;
        return (
          <TouchableOpacity key={item.key} activeOpacity={0.9} onPress={() => onChange(item.key)}>
            <Text style={{ color: active ? COLORS.white : "rgba(255,255,255,0.48)", fontSize: 25, fontWeight: active ? "900" : "500" }}>{item.label}</Text>
            <View style={{ height: 4, marginTop: 4, borderRadius: 999, backgroundColor: active ? "#67EDFF" : "transparent", width: active ? 38 : 0 }} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SegmentBar<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 22, marginTop: 18 }}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <TouchableOpacity key={item.key} activeOpacity={0.92} onPress={() => onChange(item.key)}>
            <LinearGradient
              colors={active ? ["#F24DDB", "#4ABFFF"] : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.14)"]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={{ minWidth: 94, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, alignItems: "center" }}
            >
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: active ? "800" : "600" }}>{item.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PosterCard({ item, large }: { item: PosterItem; large?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(item.route as never)}
      style={{
        width: large ? 290 : 140,
        height: large ? 390 : 195,
        marginRight: 14,
        borderRadius: 26,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      <LinearGradient colors={["rgba(43,49,142,0.88)", "rgba(15,18,53,0.98)"]} style={{ flex: 1 }}>
        <View style={{ position: "absolute", inset: 0, backgroundColor: item.imageUrl ? "transparent" : "rgba(255,255,255,0.05)" }} />
        <LinearGradient
          colors={large ? ["rgba(255,255,255,0.08)", "rgba(255,123,0,0.34)", "rgba(15,18,53,0.95)"] : ["rgba(255,255,255,0.06)", "rgba(15,18,53,0.92)"]}
          style={{ flex: 1, justifyContent: "space-between", padding: large ? 18 : 12 }}
        >
          <View>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: large ? 14 : 11, fontWeight: "800" }}>{item.subtitle}</Text>
            <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: large ? 13 : 10, marginTop: 4 }}>{item.caption}</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontSize: large ? 38 : 20, fontWeight: "900", lineHeight: large ? 42 : 22 }} numberOfLines={large ? 2 : 3}>
              {item.title}
            </Text>
            {large ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[0, 1, 2].map((dot) => (
                    <View key={dot} style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: dot === 1 ? COLORS.white : "rgba(255,255,255,0.4)" }} />
                  ))}
                </View>
                <LinearGradient colors={["#87A5FF", "#7A8CFF", "#A66FFF"]} style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons color={COLORS.white} name="play" size={26} />
                </LinearGradient>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function StatusTile({ item }: { item: StatusItem }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => item.route ? router.push(item.route as never) : undefined}
      style={{ width: 120, height: 120, borderRadius: 6, overflow: "hidden", marginRight: 10 }}
    >
      <LinearGradient colors={[item.colorA, item.colorB]} style={{ flex: 1, justifyContent: "flex-end", padding: 10 }}>
        <Text style={{ color: COLORS.white, fontSize: 23, fontWeight: "900" }} numberOfLines={2}>{item.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function Chip({ label, tone }: { label: string; tone?: string }) {
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: tone ?? "rgba(255,255,255,0.18)", marginRight: 6, marginTop: 6 }}>
      <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function SquadRow({
  item,
  showJoin,
  joining,
  onJoin,
  showPoints,
}: {
  item: SquadItem;
  showJoin?: boolean;
  joining?: boolean;
  onJoin?: () => void;
  showPoints?: boolean;
}) {
  const tagColors = ["#FFB21C", "#FF5C8A", "#1FD596", "#3AA5FF", "#B665FF"];

  return (
    <View style={{ paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 24, marginRight: 10, alignItems: "center" }}>
        <Text style={{ color: item.rank <= 3 ? "#FFD56A" : "rgba(255,255,255,0.7)", fontSize: 28, fontWeight: "900" }}>{item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : item.rank}</Text>
      </View>
      <LinearGradient colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"]} style={{ width: 72, height: 72, borderRadius: 36, marginRight: 12, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons color={COLORS.white} name="shield-account" size={34} />
        <View style={{ position: "absolute", bottom: -2, left: 10, borderRadius: 10, backgroundColor: "#FF4F7A", paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "800" }}>active</Text>
        </View>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{item.agencyName}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          <Chip label={`${item.memberCount}`} tone="#FFB21C" />
          <Chip label={`${item.onlineCount}`} tone="#FF5C8A" />
          {item.tags.slice(0, 3).map((tag, index) => <Chip key={`${item.id}-${tag}`} label={tag} tone={tagColors[index % tagColors.length]} />)}
        </View>
        {!showPoints ? <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 8 }} numberOfLines={1}>{item.description}</Text> : null}
      </View>
      {showJoin ? (
        <TouchableOpacity activeOpacity={0.92} onPress={onJoin} disabled={joining}>
          <LinearGradient colors={["#ED59DE", "#48BFFF"]} style={{ width: 96, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>{joining ? "..." : "Join"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={{ alignItems: "flex-end", minWidth: 82 }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }}>{item.prestigePoints}</Text>
          <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 13 }}>{showPoints ? "Points" : item.country}</Text>
        </View>
      )}
    </View>
  );
}

function TaskRow({
  title,
  subtitle,
  actionLabel,
  completed,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  completed?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <LinearGradient colors={["#6AC5FF", "#3C89FF"]} style={{ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
        <MaterialCommunityIcons color={COLORS.white} name={icon} size={30} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
        <View style={{ minWidth: 108, borderRadius: 24, backgroundColor: completed ? "rgba(109,255,177,0.18)" : "rgba(255,255,255,0.12)", paddingHorizontal: 18, paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ color: completed ? "#85FFB9" : COLORS.white, fontSize: 16, fontWeight: "800" }}>{completed ? "Done" : actionLabel}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";

  const [mode, setMode] = useState<HubMode>("shorts");
  const [statusMode, setStatusMode] = useState<StatusMode>("hot");
  const [squadMode, setSquadMode] = useState<SquadMode>("popular");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [country, setCountry] = useState("");

  const meQuery = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const bannersQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });
  const liveQuery = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const popularSquadsQuery = trpc.agency.listPublicSquads.useQuery({ view: "POPULAR", limit: 16 }, { retry: false });
  const rankedSquadsQuery = trpc.agency.listPublicSquads.useQuery({ view: "RANK", limit: 16 }, { retry: false });
  const mySquadQuery = trpc.agency.getMySquadOverview.useQuery(undefined, { retry: false, enabled: isAuthenticated });

  const createSquad = trpc.agency.applyAsAgency.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setSquadMode("my");
      void mySquadQuery.refetch();
      void popularSquadsQuery.refetch();
      void rankedSquadsQuery.refetch();
      Alert.alert("Squad created", "Your squad is live now and visible in the public squad list.");
    },
    onError: (error: unknown) => Alert.alert("Unable to create squad", error instanceof Error ? error.message : "Please try again."),
  });

  const joinSquad = trpc.agency.joinSquad.useMutation({
    onSuccess: () => {
      setSquadMode("my");
      void mySquadQuery.refetch();
      void popularSquadsQuery.refetch();
      void rankedSquadsQuery.refetch();
      Alert.alert("Joined squad", "You are now part of the squad.");
    },
    onError: (error: unknown) => Alert.alert("Unable to join squad", error instanceof Error ? error.message : "Please try again."),
  });

  const recordDailyLogin = trpc.level.recordDailyLogin.useMutation({
    onSuccess: (result: any) => {
      void mySquadQuery.refetch();
      Alert.alert("Check-in complete", `You earned ${Number(result?.xpAwarded ?? 0)} prestige points.`);
    },
    onError: (error: unknown) => Alert.alert("Unable to check in", error instanceof Error ? error.message : "Please try again."),
  });

  const banners = ((bannersQuery.data ?? []) as any[]).slice(0, 8);
  const liveStreams = ((liveQuery.data?.streams ?? []) as any[]).slice(0, 8);
  const popularSquads = ((popularSquadsQuery.data?.items ?? []) as SquadItem[]);
  const rankedSquads = ((rankedSquadsQuery.data?.items ?? []) as SquadItem[]);
  const mySquad = mySquadQuery.data?.squad as any;
  const myTasks = mySquadQuery.data?.tasks as any;

  const shortPosters = useMemo<PosterItem[]>(() => {
    const bannerCards = banners.map((banner, index) => ({
      id: `banner-${banner.id ?? index}`,
      title: String(banner.title ?? "Featured Short"),
      subtitle: String(banner.subtitle ?? banner.title ?? "MissU Pro"),
      caption: index % 2 === 0 ? "EP 01/61" : `EP 0${(index % 7) + 1}/48`,
      imageUrl: banner.imageUrl ?? null,
      route: String(banner.linkTarget ?? "/leaderboards").startsWith("/") ? String(banner.linkTarget) : "/leaderboards",
    }));

    const liveCards = liveStreams.map((stream, index) => ({
      id: `stream-${stream.streamId ?? index}`,
      title: String(stream.title ?? stream.displayName ?? "Live Premiere"),
      subtitle: String(stream.displayName ?? "Featured creator"),
      caption: `${Math.max(1, index + 1).toString().padStart(2, "0")}/24`,
      imageUrl: stream.coverImageUrl ?? stream.avatarUrl ?? null,
      route: `/stream/${String(stream.streamId)}`,
    }));

    return [...bannerCards, ...liveCards].slice(0, 7);
  }, [banners, liveStreams]);

  const recentShorts = useMemo(() => shortPosters.slice(0, 6), [shortPosters]);

  const statusCards = useMemo<StatusItem[]>(() => {
    const bannerStatuses = banners.map((banner, index) => ({
      id: `status-banner-${banner.id ?? index}`,
      title: toHashtag(String(banner.title ?? banner.subtitle ?? `Status ${index + 1}`)),
      colorA: ["#F9AEC7", "#3E4F97", "#7B2F83", "#B45A0E"][index % 4]!,
      colorB: ["#FFDAE7", "#101C4D", "#E27BE5", "#F9A43F"][index % 4]!,
      route: String(banner.linkTarget ?? "/leaderboards").startsWith("/") ? String(banner.linkTarget) : "/leaderboards",
    }));
    const liveStatuses = liveStreams.map((stream, index) => ({
      id: `status-live-${stream.streamId ?? index}`,
      title: toHashtag(String(stream.title ?? stream.displayName ?? `Live ${index + 1}`)),
      colorA: ["#AA84FF", "#944C39", "#3066E0"][index % 3]!,
      colorB: ["#4E2A8F", "#F08A4B", "#8FD7FF"][index % 3]!,
      route: `/stream/${String(stream.streamId)}`,
    }));
    return [...bannerStatuses, ...liveStatuses].slice(0, 12);
  }, [banners, liveStreams]);

  const filteredStatuses = useMemo(() => {
    if (statusMode === "new") {
      return [...statusCards].reverse();
    }
    if (statusMode === "followed") {
      return isAuthenticated ? statusCards.slice(0, 5) : [];
    }
    return statusCards;
  }, [isAuthenticated, statusCards, statusMode]);

  const activeSquadList = squadMode === "rank" ? rankedSquads : popularSquads;

  const handleCreateSquad = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign in required", "Sign in to create a squad.");
      return;
    }

    createSquad.mutate({
      name: name.trim(),
      contactName: contactName.trim() || String(meQuery.data?.displayName ?? ""),
      contactEmail: contactEmail.trim() || String(meQuery.data?.email ?? "creator@missupro.app"),
      country: country.trim() || String(meQuery.data?.country ?? "India"),
    });
  };

  const openCreateModal = () => {
    if (!isAuthenticated) {
      Alert.alert("Sign in required", "Sign in to create a squad.");
      return;
    }

    setName("");
    setContactName(String(meQuery.data?.displayName ?? ""));
    setContactEmail(String(meQuery.data?.email ?? ""));
    setCountry(String(meQuery.data?.country ?? "India"));
    setCreateOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1237" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <AnimatedSnow density={22} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 130 }}>
        <HeaderTabs value={mode} onChange={setMode} />

        {mode === "shorts" ? (
          <>
            <View style={{ paddingHorizontal: 22, marginTop: 18 }}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} snapToInterval={304} decelerationRate="fast">
                {shortPosters.length ? shortPosters.map((item, index) => <PosterCard key={`${item.id}-${index}`} item={item} large={index === 0} />) : (
                  <View style={{ width: 290, height: 390, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <ActivityIndicator color={COLORS.white} />
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 22, marginTop: 24 }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900", marginBottom: 14 }}>Recently Viewed</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentShorts.map((item, index) => <PosterCard key={`${item.id}-recent-${index}`} item={item} />)}
              </ScrollView>
            </View>
          </>
        ) : null}

        {mode === "status" ? (
          <>
            <SegmentBar items={STATUS_LABELS} value={statusMode} onChange={setStatusMode} />
            <View style={{ paddingHorizontal: 22, marginTop: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Trending</Text>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setStatusMode("new")} style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 15, fontWeight: "700" }}>More</Text>
                <MaterialCommunityIcons color="rgba(255,255,255,0.82)" name="chevron-right" size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingLeft: 22, marginTop: 14 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filteredStatuses.map((item) => <StatusTile key={item.id} item={item} />)}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 22, marginTop: 90 }}>
              <Text style={{ color: "rgba(255,255,255,0.56)", textAlign: "center", fontSize: 18, fontWeight: "500" }}>
                {statusMode === "followed" && !isAuthenticated ? "Sign in to load followed statuses" : "No More Data"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push("/(tabs)/live" as never)}
              style={{ position: "absolute", right: 24, bottom: 118, width: 68, height: 68, borderRadius: 34, overflow: "hidden" }}
            >
              <LinearGradient colors={["rgba(38,38,48,0.94)", "rgba(38,38,48,0.94)"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons color="#58C8FF" name="plus" size={38} />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : null}

        {mode === "squad" ? (
          <>
            <SegmentBar items={SQUAD_LABELS} value={squadMode} onChange={setSquadMode} />

            {squadMode !== "my" ? (
              <View style={{ paddingHorizontal: 22, marginTop: 18, alignItems: "flex-end" }}>
                <TouchableOpacity activeOpacity={0.92} onPress={openCreateModal} style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons color={COLORS.white} name="plus" size={24} />
                </TouchableOpacity>
              </View>
            ) : null}

            {squadMode === "popular" ? (
              <View style={{ marginTop: 8 }}>
                {activeSquadList.length ? activeSquadList.map((item) => (
                  <SquadRow
                    key={item.id}
                    item={item}
                    showJoin
                    joining={joinSquad.isPending}
                    onJoin={() => {
                      if (!isAuthenticated) {
                        Alert.alert("Sign in required", "Sign in to join a squad.");
                        return;
                      }
                      joinSquad.mutate({ agencyId: item.id });
                    }}
                  />
                )) : (
                  <View style={{ padding: 32, alignItems: "center" }}>
                    <ActivityIndicator color={COLORS.white} />
                  </View>
                )}
              </View>
            ) : null}

            {squadMode === "rank" ? (
              <View style={{ marginTop: 8 }}>
                {rankedSquads.length ? rankedSquads.map((item) => <SquadRow key={item.id} item={item} showPoints />) : (
                  <View style={{ padding: 32, alignItems: "center" }}>
                    <ActivityIndicator color={COLORS.white} />
                  </View>
                )}
                {!mySquad ? (
                  <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.18)", marginRight: 14, alignItems: "center", justifyContent: "center" }}>
                        <MaterialCommunityIcons color="rgba(255,255,255,0.82)" name="account-group" size={38} />
                      </View>
                      <Text style={{ color: "rgba(255,255,255,0.82)", flex: 1, fontSize: 18 }}>You are not in a Squad, Join now or create your own!</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {squadMode === "my" ? (
              <View style={{ marginTop: 20 }}>
                {!mySquad ? (
                  <View style={{ paddingHorizontal: 22 }}>
                    <LinearGradient colors={["rgba(170,0,255,0.92)", "rgba(83,0,173,0.92)"]} style={{ borderRadius: 22, padding: 26, shadowColor: "#7A00E6", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" }}>
                          <MaterialCommunityIcons color={COLORS.white} name="account-group" size={74} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "700", lineHeight: 28 }}>You are not in a Squad, Join now or create your own!</Text>
                          <TouchableOpacity activeOpacity={0.92} onPress={openCreateModal} style={{ alignSelf: "flex-start", marginTop: 20 }}>
                            <LinearGradient colors={["#F05AD8", "#46C3FF"]} style={{ borderRadius: 24, paddingHorizontal: 24, paddingVertical: 13 }}>
                              <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>Create Squad</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 22 }}>
                    <LinearGradient colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]} style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
                      <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900" }}>{String(mySquad.agencyName ?? "My Squad")}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6, fontSize: 15 }}>{Number(mySquad.memberCount ?? 0)} members · {Number(mySquad.onlineCount ?? 0)} active now · {Number(mySquad.prestigePoints ?? 0)} prestige</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                        {((mySquad.tags ?? []) as string[]).map((tag, index) => <Chip key={`${tag}-${index}`} label={tag} tone={["#FFB21C", "#FF5C8A", "#17D69C", "#4A97FF"][index % 4]} />)}
                      </View>
                    </LinearGradient>
                  </View>
                )}

                <View style={{ paddingHorizontal: 22, marginTop: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Squad Tasks</Text>
                  <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 22, fontWeight: "500" }}>Ranking</Text>
                </View>

                <View style={{ marginTop: 18, backgroundColor: "rgba(5,10,26,0.58)" }}>
                  <TaskRow
                    title="Check-in"
                    subtitle="Get 20 Prestige Points for Check-in here every day"
                    actionLabel="Check-in"
                    completed={Boolean(myTasks?.checkIn?.completed)}
                    icon="calendar-check"
                    onPress={() => {
                      if (!isAuthenticated) {
                        Alert.alert("Sign in required", "Sign in to check in.");
                        return;
                      }
                      if (!myTasks?.checkIn?.completed) {
                        recordDailyLogin.mutate();
                      }
                    }}
                  />
                  <TaskRow
                    title="Squad talk"
                    subtitle="Get 20 Prestige Points for send a message in the squad each day first time"
                    actionLabel="To do"
                    completed={Boolean(myTasks?.squadTalk?.completed)}
                    icon="message-text"
                    onPress={() => router.push("/(tabs)/messages" as never)}
                  />
                  <TaskRow
                    title="Squad Friend-Finder"
                    subtitle="Get 100 Prestige Points for being the first user to follow and be followed by 3 other clan members"
                    actionLabel="To do"
                    completed={Boolean(myTasks?.squadFriendFinder?.completed)}
                    icon="account-multiple-plus"
                    onPress={() => router.push("/profile/following" as never)}
                  />
                  <TaskRow
                    title="Watching Broads"
                    subtitle="Get 50 Prestige Points for watching at least 20 minutes of any streaming in the day"
                    actionLabel="To do"
                    completed={Boolean(myTasks?.watchingBroads?.completed)}
                    icon="play-box-multiple"
                    onPress={() => router.push("/(tabs)/live" as never)}
                  />
                  <TaskRow
                    title="Gifting"
                    subtitle="Send a gift today to raise your squad prestige and complete your daily task"
                    actionLabel="To do"
                    completed={Boolean(myTasks?.gifting?.completed)}
                    icon="gift"
                    onPress={() => router.push("/gifts" as never)}
                  />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={createOpen} onRequestClose={() => setCreateOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(6,10,28,0.74)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#111A4C", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 22, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Create Squad</Text>
            <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 6 }}>Create a live squad backed by the agency system and available to join from the app.</Text>

            {[{ label: "Squad Name", value: name, setter: setName, placeholder: "SRP Media Agency" }, { label: "Contact Name", value: contactName, setter: setContactName, placeholder: "Arind" }, { label: "Contact Email", value: contactEmail, setter: setContactEmail, placeholder: "name@example.com" }, { label: "Country", value: country, setter: setCountry, placeholder: "India" }].map((field) => (
              <View key={field.label} style={{ marginTop: 16 }}>
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.08)", color: COLORS.white, fontSize: 15 }}
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 22 }}>
              <Pressable onPress={() => setCreateOpen(false)} style={{ flex: 1, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", paddingVertical: 15, alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <TouchableOpacity activeOpacity={0.92} onPress={handleCreateSquad} disabled={createSquad.isPending || !name.trim()} style={{ flex: 1 }}>
                <LinearGradient colors={["#F159DE", "#4ABFFF"]} style={{ borderRadius: 18, paddingVertical: 15, alignItems: "center", opacity: createSquad.isPending || !name.trim() ? 0.6 : 1 }}>
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800" }}>{createSquad.isPending ? "Creating..." : "Create Squad"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
