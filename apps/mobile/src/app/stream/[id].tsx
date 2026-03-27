import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let RenderModeType: any = {};
let RtcSurfaceView: any = View;
let VideoSourceType: any = {};
try {
  const agora = require("react-native-agora");
  RenderModeType = agora.RenderModeType;
  RtcSurfaceView = agora.RtcSurfaceView;
  VideoSourceType = agora.VideoSourceType;
} catch {
  // react-native-agora not linked (Expo Go)
}
import { Avatar, Button } from "@/components/ui";
import { useSocket } from "@/hooks/useSocket";
import { useLiveRtc } from "@/hooks/useLiveRtc";
import { trpc } from "@/lib/trpc";
import { COLORS, RADIUS } from "@/theme";
import { useAuthStore, useUIStore } from "@/store";
import { SOCKET_EVENTS } from "@missu/types";

const { width, height } = Dimensions.get("window");

type ChatMessage = {
  id: string;
  userId: string;
  message: string;
  username: string;
  timestamp: number;
};

type StreamSyncEvent = {
  event: string;
  payload: Record<string, any>;
};

type GiftOverlayEvent = {
  giftId?: string;
  giftName?: string;
  senderName?: string;
  quantity?: number;
  effect?: string;
};

type OverlayKey = "inbox" | "tools" | "play" | "topup" | "gifts" | "profile" | null;
type GiftTab = "events" | "3d" | "popular" | "luxury" | "privilege" | "backpack";

const GIFT_TABS: Array<{ key: GiftTab; label: string }> = [
  { key: "events", label: "Events" },
  { key: "3d", label: "3D" },
  { key: "popular", label: "Popular" },
  { key: "luxury", label: "Luxury" },
  { key: "privilege", label: "Privilege" },
  { key: "backpack", label: "Backpack" },
];

const TOOL_ITEMS = [
  { key: "bag", label: "Beans bag", icon: "bag-personal-outline", route: "/bag" },
  { key: "tasks", label: "My Tasks", icon: "checkbox-marked-circle-outline", route: "/tasks" },
  { key: "topup", label: "Top up", icon: "wallet-plus-outline", route: "/wallet/purchase" },
  { key: "luckydraw", label: "Lucky draw", icon: "wheel-barrow", route: "/games" },
  { key: "vip", label: "VIP", icon: "crown-outline", route: "/vip" },
  { key: "share", label: "Share", icon: "share-variant-outline", route: "/profile/edit" },
  { key: "store", label: "Store", icon: "storefront-outline", route: "/store" },
  { key: "effect", label: "Effect", icon: "star-four-points-outline", route: "/settings/effects" },
];

const PLAY_ITEMS = [
  { title: "Fruit Challenges", subtitle: "Fruit Challenges", emoji: "🍉" },
  { title: "Warrior's Fortune", subtitle: "Warrior Fortune", emoji: "👑" },
  { title: "Treasure Hunt", subtitle: "Treasure Hunt", emoji: "🪙" },
  { title: "Caravan 21", subtitle: "Caravan 21", emoji: "🏜️" },
  { title: "SK Derby", subtitle: "SK Derby", emoji: "🐎" },
  { title: "Master Blaster", subtitle: "Master Blaster", emoji: "🏏" },
  { title: "Cricket Stars", subtitle: "Cricket Stars", emoji: "🏟️" },
  { title: "Lucky Zodiac", subtitle: "Lucky Zodiac", emoji: "🔮" },
  { title: "Jeeto Jam", subtitle: "Jeeto Jam", emoji: "🎡" },
];

function classifyGift(price: number, tier: string, index: number): GiftTab {
  if (price <= 0) return "backpack";
  if (price <= 1_000) return index % 2 === 0 ? "popular" : "events";
  if (tier === "MICRO") return "events";
  if (tier === "STANDARD") return index % 3 === 0 ? "3d" : "popular";
  if (tier === "PREMIUM") return "luxury";
  if (tier === "LEGENDARY") return "privilege";
  return "popular";
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function SheetTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 22, paddingBottom: 8, borderBottomWidth: 3, borderBottomColor: active ? "#6DE6FF" : "transparent" }}>
      <Text style={{ color: active ? "#8BEFFF" : "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: active ? "800" : "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function OverlayButton({ icon, onPress, accent }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: accent ? "rgba(255,91,191,0.26)" : "rgba(255,255,255,0.12)" }}>
      <MaterialCommunityIcons color={accent ? "#FFD768" : COLORS.white} name={icon} size={24} />
    </TouchableOpacity>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.12)", marginRight: 8 }}>
      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

export default function StreamScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = String(id);
  const { emit, emitWithAck, on } = useSocket();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const roomQuery = trpc.live.getViewerRoom.useQuery({ streamId }, { enabled: !!id, retry: false });
  const me = trpc.user.getMe.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const joinStream = trpc.live.joinStream.useMutation();
  const leaveStream = trpc.live.leaveStream.useMutation();
  const issueViewerToken = trpc.live.issueViewerToken.useMutation();
  const issueHostToken = trpc.live.issueHostToken.useMutation();
  const endStream = trpc.live.endStream.useMutation({
    onSuccess: () => {
      router.back();
    },
  });
  const inbox = trpc.social.listConversations.useQuery({ limit: 10 }, { retry: false, enabled: isAuthenticated });
  const walletPackages = trpc.wallet.getCoinPackages.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const myBadges = trpc.level.getUserBadges.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const mySquadOverview = trpc.agency.getMySquadOverview.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const hostProfile = trpc.discovery.getModelCard.useQuery({ modelId: String((roomQuery.data as any)?.stream?.hostUserId ?? "") }, { retry: false, enabled: isAuthenticated && Boolean((roomQuery.data as any)?.stream?.hostUserId) });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [giftEvents, setGiftEvents] = useState<GiftOverlayEvent[]>([]);
  const [rtcCredentials, setRtcCredentials] = useState<any | null>(null);
  const [rtcBootstrapError, setRtcBootstrapError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayKey>(null);
  const [giftTab, setGiftTab] = useState<GiftTab>("events");
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const joinedPresenceRef = useRef(false);

  const stream = (roomQuery.data as any)?.stream;
  const topSupporters = ((roomQuery.data as any)?.topSupporters ?? []) as any[];
  const activeViewers = ((roomQuery.data as any)?.activeViewers ?? []) as any[];
  const relatedStreams = ((roomQuery.data as any)?.relatedStreams ?? []) as any[];
  const monetization = (roomQuery.data as any)?.monetization ?? {};
  const featureHints = (roomQuery.data as any)?.liveConfig?.uiLayoutHints;
  const isHost = !!stream?.hostUserId && stream.hostUserId === me.data?.id;
  const layoutHints = (roomQuery.data as any)?.liveConfig?.layout;
  const meResolved = !isAuthenticated || me.isFetched || !!me.error;
  const pkRival = relatedStreams[0] ?? null;

  const gifts = useMemo(() => (((monetization.gifts ?? []) as any[]).map((gift, index) => ({
    ...gift,
    id: String(gift.id ?? gift.catalogKey ?? `gift-${index}`),
    tab: classifyGift(Number(gift.coinPrice ?? 0), String(gift.effectTier ?? "STANDARD").toUpperCase(), index),
  }))), [monetization.gifts]);
  const visibleGifts = gifts.filter((gift) => gift.tab === giftTab);
  const selectedGift = visibleGifts.find((gift) => String(gift.id) === selectedGiftId)
    ?? gifts.find((gift) => String(gift.id) === selectedGiftId)
    ?? visibleGifts[0]
    ?? gifts[0]
    ?? null;

  const rtc = useLiveRtc({
    enabled: Boolean(rtcCredentials && isAuthenticated && stream),
    role: isHost ? "host" : "viewer",
    credentials: rtcCredentials,
  });

  const primaryRemoteUid = rtc.remoteUids[0];
  const localCanvas = useMemo(() => ({
    uid: 0,
    renderMode: RenderModeType.RenderModeHidden,
    sourceType: VideoSourceType.VideoSourceCameraPrimary,
  }), []);
  const remoteCanvas = useMemo(() => ({
    uid: primaryRemoteUid,
    renderMode: RenderModeType.RenderModeHidden,
  }), [primaryRemoteUid]);

  useEffect(() => {
    setMessages((((roomQuery.data as any)?.recentChat ?? []) as ChatMessage[]).slice(-100));
    setViewerCount(Number(stream?.viewerCount ?? 0));
  }, [roomQuery.data, stream?.viewerCount]);

  useEffect(() => {
    setRtcCredentials(null);
    setRtcBootstrapError(null);

    if (!stream || !streamId || !isAuthenticated || !meResolved) {
      return;
    }

    let disposed = false;

    const bootstrapRtc = async () => {
      try {
        if (isHost) {
          const hostRtc = await issueHostToken.mutateAsync({ streamId });
          if (!disposed) setRtcCredentials(hostRtc);
          return;
        }

        await joinStream.mutateAsync({ streamId });
        joinedPresenceRef.current = true;
        const viewerRtc = await issueViewerToken.mutateAsync({ streamId });
        if (!disposed) setRtcCredentials(viewerRtc);
      } catch (error: any) {
        if (!disposed) setRtcBootstrapError(error?.message ?? "Unable to connect to the live stream.");
      }
    };

    void bootstrapRtc();

    return () => {
      disposed = true;
      setRtcCredentials(null);
      if (joinedPresenceRef.current && !isHost) {
        joinedPresenceRef.current = false;
        void leaveStream.mutateAsync({ streamId }).catch(() => undefined);
      }
    };
  }, [isAuthenticated, isHost, issueHostToken, issueViewerToken, joinStream, leaveStream, meResolved, stream?.streamId, streamId]);

  useEffect(() => {
    if (!id) return;

    emit(SOCKET_EVENTS.STREAM.JOIN, { roomId: id });
    emit(SOCKET_EVENTS.STREAM.SYNC_REQUEST, { roomId: id, limit: 30 });

    const pushMessage = (msg: any) => {
      setMessages((prev) => [...prev.slice(-100), { ...msg, id: String(msg.id ?? Date.now()) }]);
    };

    const unsub1 = on(SOCKET_EVENTS.STREAM.CHAT_MESSAGE, (msg: ChatMessage) => {
      pushMessage(msg);
    });

    const unsub2 = on(SOCKET_EVENTS.STREAM.VIEWER_JOINED, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => c + 1);
    });

    const unsub3 = on(SOCKET_EVENTS.STREAM.VIEWER_LEFT, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => Math.max(0, c - 1));
    });

    const unsub4 = on(SOCKET_EVENTS.STREAM.SYNC_STATE, (payload: { viewerCount: number; recentEvents: StreamSyncEvent[]; recentMessages?: ChatMessage[] }) => {
      setViewerCount(payload.viewerCount ?? 0);
      const replayedMessages = (payload.recentMessages?.length
        ? payload.recentMessages
        : (payload.recentEvents ?? [])
          .filter((event) => event.event === SOCKET_EVENTS.STREAM.CHAT_MESSAGE)
          .map((event, index) => ({ ...(event.payload as ChatMessage), id: String((event.payload as any).id ?? `replay-${index}`) }))) as ChatMessage[];
      setMessages(replayedMessages.slice(-100));
    });

    const unsub5 = on(SOCKET_EVENTS.GIFT.RECEIVED_LIVE, (payload: GiftOverlayEvent) => {
      setGiftEvents((current) => [payload, ...current].slice(0, 4));
    });

    return () => {
      emit(SOCKET_EVENTS.STREAM.LEAVE, { roomId: id });
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
      unsub5?.();
    };
  }, [emit, id, on]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const response = await emitWithAck<{ ok: boolean }>(SOCKET_EVENTS.STREAM.CHAT, { roomId: id, message: inputText.trim() }).catch(() => ({ ok: false }));
    if (!response?.ok) return;
    setInputText("");
  };

  const rtcMessage = rtc.error ?? rtcBootstrapError ?? (!isAuthenticated ? "Sign in to watch the live video feed." : null);
  const videoStatus = isHost
    ? (rtc.joined ? "Broadcasting" : rtc.statusLabel === "connecting" ? "Connecting camera" : "Preparing stream")
    : (primaryRemoteUid ? "Live video connected" : rtc.statusLabel === "connecting" ? "Joining live video" : "Waiting for host video");

  if (roomQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#12051F", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.white} size="large" />
      </View>
    );
  }

  if (!stream) {
    return (
      <View style={{ flex: 1, backgroundColor: "#12051F", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Stream unavailable</Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", textAlign: "center", lineHeight: 22, marginTop: 10 }}>The host may have ended the session or the room could not be loaded.</Text>
        <Button title="Back" onPress={() => router.back()} style={{ marginTop: 18, width: "100%" }} />
      </View>
    );
  }

  const latestGift = giftEvents[0] ?? null;
  const activeConversations = ((inbox.data?.conversations ?? []) as any[]).slice(0, 3);
  const packageList = ((walletPackages.data ?? monetization.coinPackages ?? []) as any[]).slice(0, 4);
  const badgeList = ((myBadges.data ?? []) as any[]).slice(0, 8);
  const squad = mySquadOverview.data?.squad as any;
  const hostCard = hostProfile.data as any;

  return (
    <View style={{ flex: 1, backgroundColor: "#22052F" }}>
      <StatusBar style="light" />
      <LinearGradient colors={["#29063A", "#22052F", "#1A0328"]} style={{ position: "absolute", inset: 0 }} />

      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOverlay("profile")} style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
              <Avatar uri={stream.avatarUrl} size={46} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }} numberOfLines={1}>{String(stream.hostDisplayName ?? stream.hostUsername ?? "Host")}</Text>
                <Text style={{ color: "#FFD768", fontSize: 13, fontWeight: "800" }}>{formatCompact(Number(stream.giftRevenueCoins ?? 0))}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOverlay("profile")} style={{ marginLeft: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(245,81,222,0.32)", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={COLORS.white} name="plus" size={22} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {activeViewers.slice(0, 4).map((viewer, index) => (
              <View key={String(viewer.userId ?? index)} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                <Avatar uri={viewer.avatarUrl} size={36} />
              </View>
            ))}
            <View style={{ marginLeft: 10, width: 52, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "900" }}>{formatCompact(viewerCount)}</Text>
            </View>
            <TouchableOpacity onPress={() => endStream.mutate({ streamId: String(id), reason: "NORMAL" })} style={{ marginLeft: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons color={COLORS.white} name="close" size={26} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <InfoChip label={String(stream.roomName ?? "Hour Star")} />
          <InfoChip label="3 Star" />
        </View>

        <View style={{ marginHorizontal: 10, borderRadius: 24, overflow: "hidden", height: height * 0.48, backgroundColor: "#1B1128", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ flexDirection: "row", flex: 1 }}>
            <View style={{ flex: 1, borderRightWidth: 2, borderRightColor: "#63D9FF", backgroundColor: "#2A2831", overflow: "hidden" }}>
              <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.01)"]} style={{ position: "absolute", inset: 0 }} />
              <View style={{ position: "absolute", top: 12, left: 12, zIndex: 2, borderRadius: 12, backgroundColor: "rgba(234,70,255,0.5)", paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "900" }}>PK SL</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {pkRival?.thumbnailUrl ? null : <Text style={{ fontSize: 92, opacity: 0.18 }}>🌸</Text>}
              </View>
              <View style={{ position: "absolute", bottom: 14, left: 0, right: 0, alignItems: "center" }}>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800" }}>{String(pkRival?.hostDisplayName ?? pkRival?.hostUsername ?? "PK Rival")}</Text>
              </View>
            </View>

            <View style={{ flex: 1, backgroundColor: "#09090E", overflow: "hidden" }}>
              {isHost ? (
                rtcCredentials?.agoraAppId ? (
                  <RtcSurfaceView style={{ position: "absolute", inset: 0 as any }} canvas={localCanvas} />
                ) : null
              ) : primaryRemoteUid ? (
                <RtcSurfaceView key={`remote-${primaryRemoteUid}`} style={{ position: "absolute", inset: 0 as any }} canvas={remoteCanvas} />
              ) : null}
              <LinearGradient colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.35)"]} style={{ position: "absolute", inset: 0 }} />
              <View style={{ position: "absolute", top: 12, right: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "900" }}>🎙 Cocomelon</Text>
              </View>
            </View>
          </View>

          <View style={{ position: "absolute", left: 0, right: 0, top: "38%", alignItems: "center" }}>
            <LinearGradient colors={["#FFD15A", "#57B9FF"]} style={{ borderRadius: 26, padding: 3 }}>
              <LinearGradient colors={["#FF60CF", "#FFBE4C"]} style={{ borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900" }}>PK</Text>
              </LinearGradient>
            </LinearGradient>
          </View>

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 54, alignItems: "center" }}>
            <View style={{ borderRadius: 999, backgroundColor: "rgba(15,18,34,0.72)", paddingHorizontal: 18, paddingVertical: 8 }}>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "900" }}>PK  {String(stream?.pkCountdown ?? "02:42")}</Text>
            </View>
          </View>

          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <LinearGradient colors={["#FF4FC3", "#5B5CFF"]} style={{ height: 16 }} />
            <View style={{ height: 50, backgroundColor: "rgba(62,24,81,0.9)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {topSupporters.slice(0, 3).map((supporter, index) => (
                  <View key={String(supporter.userId ?? index)} style={{ alignItems: "center", marginRight: 10 }}>
                    <Avatar uri={supporter.avatarUrl} size={30} />
                    <Text style={{ color: "#FFD768", fontSize: 11, fontWeight: "900", marginTop: 2 }}>{index + 1}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: "#FFD768", fontSize: 15, fontWeight: "900", marginRight: 6 }}>{latestGift ? `Combo x ${Math.max(1, Number(latestGift.quantity ?? 1))}` : rtcMessage ?? videoStatus}</Text>
                <Text style={{ fontSize: 28 }}>🛼</Text>
              </View>
            </View>
          </View>
        </View>

        {latestGift ? (
          <View style={{ marginHorizontal: 12, marginTop: 10, borderRadius: 18, backgroundColor: "rgba(26,14,30,0.92)", padding: 12, flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <Text style={{ fontSize: 28 }}>💋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }} numberOfLines={1}>{String(latestGift.senderName ?? "Viewer")} sent {String(latestGift.giftName ?? "Gift")}</Text>
              <Text style={{ color: "#FFD668", marginTop: 4, fontWeight: "900" }}>Combo x {Number(latestGift.quantity ?? 1)}</Text>
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: overlay ? 400 : 132 }}>
          <View style={{ maxWidth: width * 0.68 }}>
            {messages.slice(-4).map((item) => (
              <View key={item.id} style={{ borderRadius: 18, backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 12, paddingVertical: 9, marginTop: 8 }}>
                <Text style={{ color: "#92F6FF", fontWeight: "800" }}>{item.username}: <Text style={{ color: COLORS.white, fontWeight: "500" }}>{item.message}</Text></Text>
              </View>
            ))}
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          {overlay ? (
            <View style={{ height: Math.min(390, height * 0.48), borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "rgba(17,17,22,0.98)", paddingTop: 14 }}>
              <View style={{ height: 4, width: 74, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)", alignSelf: "center", marginBottom: 16 }} />

              {overlay === "tools" ? (
                <View style={{ paddingHorizontal: 18 }}>
                  <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 16 }}>Tools</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {TOOL_ITEMS.map((item) => (
                      <TouchableOpacity key={item.key} onPress={() => { setOverlay(null); router.push(item.route as never); }} style={{ width: "23%", alignItems: "center", marginBottom: 18 }}>
                        <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <MaterialCommunityIcons color={COLORS.white} name={item.icon as any} size={28} />
                        </View>
                        <Text style={{ color: COLORS.white, fontSize: 13, textAlign: "center", marginTop: 10 }}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {overlay === "play" ? (
                <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}>
                  <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 16 }}>Play Center</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {PLAY_ITEMS.map((item) => (
                      <TouchableOpacity key={item.title} onPress={() => router.push("/games" as never)} style={{ width: "31%", marginBottom: 16 }}>
                        <View style={{ height: 102, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 34 }}>{item.emoji}</Text>
                        </View>
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "700", marginTop: 8 }}>{item.subtitle}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : null}

              {overlay === "topup" ? (
                <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}>
                  <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 16 }}>Special Gift Packages</Text>
                  {packageList.map((pkg, index) => (
                    <TouchableOpacity key={String(pkg.id ?? index)} onPress={() => router.push("/wallet/purchase" as never)} style={{ borderRadius: 22, backgroundColor: index === 0 ? "rgba(255,132,196,0.18)" : "rgba(255,255,255,0.05)", padding: 16, marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }}>{String(pkg.title ?? pkg.name ?? `Package ${index + 1}`)}</Text>
                          <Text style={{ color: "#FFD668", fontSize: 15, fontWeight: "800", marginTop: 6 }}>{Number(pkg.coins ?? pkg.amount ?? 0).toLocaleString()} coins</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ color: COLORS.white, fontWeight: "900" }}>{String(pkg.priceDisplay ?? pkg.price ?? "-")}</Text>
                          {Number(pkg.bonusCoins ?? 0) > 0 ? <Text style={{ color: "#8CF1B0", marginTop: 4 }}>+{Number(pkg.bonusCoins ?? 0)}</Text> : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              {overlay === "inbox" ? (
                <View style={{ paddingHorizontal: 18 }}>
                  <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 16 }}>Inbox</Text>
                  {activeConversations.length > 0 ? activeConversations.map((conversation, index) => (
                    <TouchableOpacity key={String(conversation.id ?? index)} onPress={() => { setOverlay(null); router.push(`/chat/${conversation.id}` as never); }} style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 14 }}>
                      <Avatar uri={conversation.otherUser?.avatarUrl ?? conversation.otherUser?.profileImage} size={52} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>{String(conversation.otherUser?.displayName ?? "Conversation")}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 6 }} numberOfLines={1}>{String(conversation.lastMessage ?? "Come chat with me!")}</Text>
                      </View>
                    </TouchableOpacity>
                  )) : (
                    <Text style={{ color: "rgba(255,255,255,0.62)", textAlign: "center" }}>No conversations yet.</Text>
                  )}
                </View>
              ) : null}

              {overlay === "profile" ? (
                <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}>
                  <View style={{ alignItems: "center" }}>
                    <Avatar uri={stream.avatarUrl} size={90} />
                    <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "300", marginTop: 14 }}>{String(hostCard?.displayName ?? stream.hostDisplayName ?? stream.hostUsername ?? "Host")}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 6 }}>{String(hostCard?.country ?? "Live host")}</Text>
                    <View style={{ flexDirection: "row", marginTop: 16 }}>
                      <InfoChip label={`${formatCompact(Number(hostCard?.followerCount ?? 0))} followers`} />
                      <InfoChip label={`Lv${Number(hostCard?.level ?? 1)}`} />
                    </View>
                  </View>

                  {squad ? (
                    <View style={{ borderRadius: 20, backgroundColor: "rgba(108,174,255,0.14)", padding: 16, marginTop: 18 }}>
                      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{String(squad.agencyName ?? "Squad")}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 6 }}>{Number(squad.memberCount ?? 0)} members · {Number(squad.prestigePoints ?? 0)} prestige</Text>
                    </View>
                  ) : null}

                  {badgeList.length > 0 ? (
                    <View style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", padding: 16, marginTop: 16 }}>
                      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: 12 }}>Badges ({badgeList.length})</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                        {badgeList.map((badge, index) => (
                          <View key={String(badge.badgeId ?? index)} style={{ width: "23%", alignItems: "center", marginBottom: 14 }}>
                            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 24 }}>{index % 3 === 0 ? "🏅" : index % 3 === 1 ? "💎" : "👑"}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
                    <TouchableOpacity onPress={() => { setOverlay(null); router.push(`/profile/${stream.hostUserId}` as never); }} style={{ flex: 1 }}>
                      <LinearGradient colors={["#F455D4", "#59CBFF"]} style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center" }}>
                        <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "900" }}>Open Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setOverlay(null); router.push("/badges" as never); }} style={{ flex: 1, borderRadius: 999, borderWidth: 2, borderColor: "#75DFFF", paddingVertical: 16, alignItems: "center" }}>
                      <Text style={{ color: "#8DEFFF", fontSize: 16, fontWeight: "900" }}>Badges</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : null}

              {overlay === "gifts" ? (
                <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    {GIFT_TABS.map((entry) => <SheetTab key={entry.key} active={entry.key === giftTab} label={entry.label} onPress={() => setGiftTab(entry.key)} />)}
                  </ScrollView>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {visibleGifts.length > 0 ? visibleGifts.map((gift, index) => (
                      <TouchableOpacity key={String(gift.id)} onPress={() => setSelectedGiftId(String(gift.id))} style={{ width: "23%", alignItems: "center", marginBottom: 16 }}>
                        <View style={{ width: 74, height: 74, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: String(selectedGift?.id) === String(gift.id) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: String(selectedGift?.id) === String(gift.id) ? "rgba(255,132,208,0.86)" : "rgba(255,255,255,0.08)" }}>
                          <Text style={{ fontSize: 30 }}>{index % 4 === 0 ? "🎁" : index % 4 === 1 ? "💋" : index % 4 === 2 ? "🚗" : "💗"}</Text>
                        </View>
                        <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700", marginTop: 10 }} numberOfLines={1}>{String(gift.displayName ?? "Gift")}</Text>
                        <Text style={{ color: "#FFD668", fontSize: 13, fontWeight: "800", marginTop: 4 }}>{formatCompact(Number(gift.coinPrice ?? 0))}</Text>
                      </TouchableOpacity>
                    )) : null}
                  </View>

                  {selectedGift ? (
                    <View style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", padding: 16, marginTop: 4 }}>
                      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{String(selectedGift.displayName ?? "Gift")}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 6 }}>{Number(selectedGift.coinPrice ?? 0).toLocaleString()} coins</Text>
                      <TouchableOpacity
                        disabled={featureHints?.giftingEnabled === false}
                        onPress={() => {
                          useUIStore.getState().openGiftDrawer({ userId: String(stream.hostUserId), context: "LIVE_STREAM", roomId: streamId });
                          setOverlay(null);
                          router.push("/gifts" as never);
                        }}
                        style={{ marginTop: 14 }}
                      >
                        <LinearGradient colors={["#FFB44A", "#FF5AB8"]} style={{ borderRadius: 999, paddingVertical: 15, alignItems: "center", opacity: featureHints?.giftingEnabled === false ? 0.5 : 1 }}>
                          <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "900" }}>Send</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10, backgroundColor: "rgba(0,0,0,0.52)" }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Say hi..."
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={{ flex: 1, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.12)", color: COLORS.white, paddingHorizontal: 16, paddingVertical: 12, marginRight: 10 }}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={featureHints?.chatEnabled !== false}
            />
            <OverlayButton icon="message-badge-outline" onPress={() => setOverlay((current) => current === "inbox" ? null : "inbox")} />
            <View style={{ width: 8 }} />
            <OverlayButton icon="clipboard-check-outline" onPress={() => setOverlay((current) => current === "tools" ? null : "tools")} />
            <View style={{ width: 8 }} />
            <OverlayButton icon="wallet-plus-outline" onPress={() => setOverlay((current) => current === "topup" ? null : "topup")} />
            <View style={{ width: 8 }} />
            <OverlayButton icon="gamepad-variant-outline" onPress={() => setOverlay((current) => current === "play" ? null : "play")} />
            <View style={{ width: 8 }} />
            <OverlayButton icon="gift-outline" accent onPress={() => setOverlay((current) => current === "gifts" ? null : "gifts")} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}