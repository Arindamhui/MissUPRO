import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Avatar, Badge, Button, Card, CoinDisplay, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore, useWalletStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";

type CreateMode = "live" | "chatParty" | "videoParty";

type ThemeRecord = {
  id: string;
  themeName: string;
  description?: string | null;
  backgroundAssetUrl?: string | null;
  colorSchemeJson?: Record<string, unknown> | null;
  isPremium?: boolean | null;
  coinPrice?: number | null;
  seasonTag?: string | null;
};

const MODE_META: Record<CreateMode, { label: string; eyebrow: string; title: string; subtitle: string; cta: string; accent: [string, string] }> = {
  live: {
    label: "Live",
    eyebrow: "Broadcast",
    title: "Go live with your audience",
    subtitle: "Set your room headline, highlight your vibe, and launch a live broadcast tied to the real streaming backend.",
    cta: "Go Live",
    accent: ["#FF6E7F", "#FF9E4F"],
  },
  chatParty: {
    label: "Chat Party",
    eyebrow: "Voice lounge",
    title: "Create a social room with seats",
    subtitle: "Spin up a party room with tags, a room skin, and live seats for guests using the existing party service.",
    cta: "Start Chat Party",
    accent: ["#8A6BFF", "#43C6FF"],
  },
  videoParty: {
    label: "Video Party",
    eyebrow: "Premium party",
    title: "Host a higher-touch party setup",
    subtitle: "Use the same party room stack with a tighter layout and premium skin previews for richer creator-led sessions.",
    cta: "Start Video Party",
    accent: ["#FF5DB1", "#6E6BFF"],
  },
};

function cleanConfigLabel(value: string) {
  return value
    .replace(/^party\./i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm }}>
      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={{ color: "#B8C8FF", fontSize: 13, fontWeight: "700" }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)",
        alignItems: "center",
      }}
    >
      <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: active ? "800" : "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoChip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={!onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: RADIUS.full,
        backgroundColor: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)",
      }}
    >
      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function DarkField({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700", marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.36)"
        multiline={multiline}
        style={{
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.1)",
          paddingHorizontal: 16,
          paddingVertical: multiline ? 16 : 14,
          minHeight: multiline ? 96 : undefined,
          color: COLORS.white,
          fontSize: 15,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function ThemeCard({
  item,
  selected,
  unlocked,
  canTry,
  onUse,
  onTry,
  onBuy,
}: {
  item: ThemeRecord;
  selected: boolean;
  unlocked: boolean;
  canTry: boolean;
  onUse: () => void;
  onTry: () => void;
  onBuy: () => void;
}) {
  const gradientColors = Array.isArray(item.colorSchemeJson?.colors)
    ? (item.colorSchemeJson?.colors as string[]).slice(0, 2)
    : ["#24367F", "#111A4C"];

  return (
    <View
      style={{
        width: 208,
        borderRadius: 24,
        overflow: "hidden",
        marginRight: 14,
        marginBottom: 14,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: selected ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.1)",
      }}
    >
      <ImageBackground
        source={item.backgroundAssetUrl ? { uri: item.backgroundAssetUrl } : undefined}
        style={{ height: 138, justifyContent: "space-between" }}
        imageStyle={{ opacity: item.backgroundAssetUrl ? 0.9 : 0.3 }}
      >
        <LinearGradient colors={[`${gradientColors[0]}CC`, `${gradientColors[1]}EE`]} style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Badge text={item.isPremium ? "Premium" : "Free"} color={item.isPremium ? "#FFD56A" : "#7AE6B8"} />
            {item.seasonTag ? <Badge text={String(item.seasonTag)} color="#B9C6FF" /> : null}
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{item.themeName}</Text>
            <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 12, marginTop: 6 }} numberOfLines={2}>
              {item.description || "Creator party skin"}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={{ padding: 14 }}>
        <Text style={{ color: "rgba(255,255,255,0.66)", fontSize: 12, marginBottom: 12 }}>
          {item.coinPrice ? `${item.coinPrice.toLocaleString()} coins / week` : "Included for all hosts"}
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={unlocked ? onUse : onTry}
            style={{
              flex: 1,
              borderRadius: 16,
              paddingVertical: 11,
              alignItems: "center",
              backgroundColor: unlocked ? (selected ? "rgba(122,230,184,0.24)" : "rgba(255,255,255,0.08)") : canTry ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: unlocked ? "rgba(122,230,184,0.36)" : canTry ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "800" }}>{unlocked ? (selected ? "Using" : "Use") : "Try"}</Text>
          </TouchableOpacity>
          {!unlocked ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={onBuy}
              style={{
                borderRadius: 16,
                paddingVertical: 11,
                paddingHorizontal: 16,
                alignItems: "center",
                backgroundColor: "rgba(255,214,106,0.16)",
                borderWidth: 1,
                borderColor: "rgba(255,214,106,0.32)",
              }}
            >
              <Text style={{ color: "#FFD56A", fontSize: 13, fontWeight: "800" }}>Buy</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function StreamPreviewCard({
  item,
  canChallenge,
  onChallenge,
}: {
  item: any;
  canChallenge: boolean;
  onChallenge: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(`/stream/${item.streamId}` as never)}
      style={{
        width: 236,
        borderRadius: 24,
        overflow: "hidden",
        marginRight: 14,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <ImageBackground
        source={item.thumbnailUrl ? { uri: item.thumbnailUrl } : item.avatarUrl ? { uri: item.avatarUrl } : undefined}
        style={{ height: 160, justifyContent: "space-between" }}
      >
        <LinearGradient colors={["rgba(8,11,32,0.05)", "rgba(8,11,32,0.82)"]} style={{ flex: 1, padding: 12, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Badge text="LIVE" color="#FF7A7A" />
            <Badge text={`👁 ${Number(item.viewerCount ?? 0)}`} color="#DCEBFF" />
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>{item.title ?? "Live Stream"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
              {item.hostDisplayName ?? item.displayName ?? "Host"}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge text={String(item.category ?? "Live")} color="#7FB0FF" />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>#{Math.max(1, Math.round(Number(item.trendingScore ?? 0)))}</Text>
        </View>
        {canChallenge ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onChallenge}
            style={{ marginTop: 12, borderRadius: 16, paddingVertical: 11, alignItems: "center", backgroundColor: "rgba(127,176,255,0.16)", borderWidth: 1, borderColor: "rgba(127,176,255,0.26)" }}
          >
            <Text style={{ color: "#DCEBFF", fontSize: 13, fontWeight: "800" }}>Challenge PK</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function PartyPreviewCard({ item }: { item: any }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push(`/party/${item.id}` as never)}
      style={{
        width: 220,
        marginRight: 14,
        borderRadius: 22,
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Badge text={String(item.roomType ?? "PUBLIC")} color="#9D8DFF" />
        {item.hasPassword ? <Badge text="Locked" color="#FFD56A" /> : null}
      </View>
      <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginTop: 14 }} numberOfLines={1}>{item.roomName ?? "Party Room"}</Text>
      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 6 }} numberOfLines={1}>{item.hostName ?? "Host"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Avatar uri={item.hostAvatar ?? undefined} size={42} />
        <View>
          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>{Number(item.maxSeats ?? 0)} seats</Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Open real-time room</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const userId = useAuthStore((state) => state.userId);
  const storedCoins = useWalletStore((state) => state.coinBalance);
  const isAuthenticated = authMode === "authenticated";

  const [mode, setMode] = useState<CreateMode>("live");
  const [roomName, setRoomName] = useState("");
  const [headline, setHeadline] = useState("Come hang out with me tonight");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"mine" | "store">("mine");
  const [gateOpen, setGateOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");

  const streams = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const myActiveStream = trpc.live.getMyActiveStream.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const me = trpc.user.getMe.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const myProfile = trpc.user.getMyProfile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const level = trpc.level.myLevel.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const creatorLevel = trpc.model.getMyLevel.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const roomConfigs = trpc.config.listPartyRoomConfigs.useQuery(undefined, { retry: false });
  const themes = trpc.party.listAvailableThemes.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const activeParties = trpc.party.listActiveRooms.useQuery({ limit: 6 }, { enabled: isAuthenticated, retry: false });
  const pkFlag = trpc.config.evaluateFeatureFlag.useQuery({ key: "pk_battles", platform: "MOBILE" }, { retry: false });

  const startLiveSession = trpc.live.startLiveSession.useMutation({
    onSuccess: (payload: any) => {
      void streams.refetch();
      void myActiveStream.refetch();
      router.push(`/stream/${payload?.stream?.streamId ?? payload?.streamId}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to start live", error?.message ?? "Try again in a moment.");
    },
  });
  const endStream = trpc.live.endStream.useMutation({
    onSuccess: () => {
      void streams.refetch();
      void myActiveStream.refetch();
      Alert.alert("Live ended", "Your stream has been closed.");
    },
    onError: (error: any) => {
      Alert.alert("Unable to end live", error?.message ?? "Try again in a moment.");
    },
  });
  const createPartyRoom = trpc.party.createRoom.useMutation({
    onSuccess: (room: any) => {
      void activeParties.refetch();
      router.push(`/party/${room.id}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to start party", error?.message ?? "Try again in a moment.");
    },
  });
  const purchaseTheme = trpc.party.purchaseTheme.useMutation({
    onSuccess: (result: any) => {
      const purchasedId = String(result?.theme?.id ?? "");
      if (purchasedId) {
        setUnlockedThemeIds((current) => (current.includes(purchasedId) ? current : [...current, purchasedId]));
        setSelectedThemeId(purchasedId);
      }
      void wallet.refetch();
      Alert.alert("Theme unlocked", "The room skin is now ready to use.");
    },
    onError: (error: any) => {
      Alert.alert("Unable to buy theme", error?.message ?? "Try again in a moment.");
    },
  });
  const requestPkBattle = trpc.live.requestPKBattle.useMutation({
    onSuccess: (session: any) => {
      router.push(`/pk/battle?sessionId=${session.id}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to start PK battle", error?.message ?? "Try again in a moment.");
    },
  });

  const streamList = (streams.data?.streams ?? []) as any[];
  const partyList = ((activeParties.data as any)?.items ?? []) as any[];
  const themeList = ((themes.data ?? []) as ThemeRecord[]).map((item) => ({ ...item, id: String(item.id) }));
  const configs = (roomConfigs.data ?? []) as Array<{ configKey: string; configJson?: Record<string, unknown> | null }>;

  const displayName = String(myProfile.data?.displayName ?? me.data?.displayName ?? "Guest Host");
  const avatarUrl = String(myProfile.data?.avatarUrl ?? me.data?.avatarUrl ?? "") || undefined;
  const locationLabel = String(
    myProfile.data?.locationDisplay
    ?? [me.data?.city, me.data?.country].filter(Boolean).join(", ")
    ?? "",
  ).trim() || "Add your location";
  const currentCoins = Number(wallet.data?.coinBalance ?? storedCoins ?? 0);
  const userLevel = Number((level.data as any)?.level ?? 0);
  const talentLevel = Number((creatorLevel.data as any)?.level ?? 0);
  const talentRole = String(me.data?.role ?? "");
  const canUsePremiumTry = userLevel >= 7 || talentLevel >= 7;
  const selectedMode = MODE_META[mode];

  const categoryChips = useMemo(() => {
    const configLabels = configs.slice(0, 2).map((config) => cleanConfigLabel(String(config.configKey ?? "Party")));
    const modeBase = mode === "live"
      ? ["Trending", "Chat", "Music", "Talent"]
      : mode === "chatParty"
        ? ["Friends", "Voice", "Lounge", "Open Mic"]
        : ["VIP", "Showcase", "After Party", "Creator Picks"];
    const dynamic = [locationLabel !== "Add your location" ? locationLabel.split(",")[0] : null, ...configLabels]
      .filter(Boolean)
      .map((entry) => String(entry));

    return [...new Set([...modeBase, ...dynamic])].slice(0, 6);
  }, [configs, locationLabel, mode]);

  const activeCategories = useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    for (const stream of streamList) {
      const next = String(stream.category ?? "Live");
      if (!seen.has(next)) {
        seen.add(next);
        items.push(next);
      }
    }
    return items;
  }, [streamList]);

  const defaultConfig = configs[0]?.configJson as Record<string, unknown> | undefined;
  const maxSeats = Math.max(4, Number(defaultConfig?.maxSeats ?? (mode === "videoParty" ? 6 : 8)));
  const maxAudience = Math.max(100, Number(defaultConfig?.maxAudience ?? (mode === "live" ? 500 : 300)));
  const defaultThemeName = String(defaultConfig?.defaultTheme ?? "").toLowerCase();

  useEffect(() => {
    if (!roomName.trim() && displayName !== "Guest Host") {
      const suffix = mode === "live" ? " Live" : mode === "chatParty" ? " Chat Party" : " Video Party";
      setRoomName(`${displayName}${suffix}`.slice(0, 60));
    }
  }, [displayName, mode, roomName]);

  useEffect(() => {
    if (!selectedTag && categoryChips.length > 0) {
      setSelectedTag(categoryChips[0]);
    }
  }, [categoryChips, selectedTag]);

  useEffect(() => {
    const freeThemeIds = themeList.filter((item) => !item.isPremium || !item.coinPrice).map((item) => item.id);
    if (freeThemeIds.length > 0) {
      setUnlockedThemeIds((current) => [...new Set([...current, ...freeThemeIds])]);
    }
  }, [themeList]);

  useEffect(() => {
    if (selectedThemeId || themeList.length === 0) return;
    const matchedTheme = themeList.find((item) => item.themeName.toLowerCase().includes(defaultThemeName));
    setSelectedThemeId(matchedTheme?.id ?? themeList[0]?.id ?? null);
  }, [defaultThemeName, selectedThemeId, themeList]);

  const unlockedThemeSet = useMemo(() => new Set(unlockedThemeIds), [unlockedThemeIds]);
  const selectedTheme = themeList.find((item) => item.id === selectedThemeId) ?? themeList[0] ?? null;
  const mineThemes = themeList.filter((item) => unlockedThemeSet.has(item.id));
  const storeThemes = themeList.filter((item) => !unlockedThemeSet.has(item.id));
  const skinSheetThemes = sheetTab === "mine" ? mineThemes : storeThemes;
  const canChallenge = pkFlag.data?.enabled !== false && Boolean(myActiveStream.data?.streamId);

  const selectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
  };

  const tryTheme = (theme: ThemeRecord) => {
    if (theme.isPremium && !canUsePremiumTry) {
      setGateOpen(true);
      return;
    }
    setSelectedThemeId(theme.id);
    setSheetOpen(false);
  };

  const handlePurchaseTheme = (theme: ThemeRecord) => {
    if (!isAuthenticated) {
      router.push("/(auth)/login" as never);
      return;
    }
    purchaseTheme.mutate({ themeId: theme.id });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${displayName} is getting ready to host ${selectedMode.label} on Miss U PRO. Room: ${roomName || `${displayName}'s Room`}`,
      });
    } catch {
      Alert.alert("Unable to share", "Try again in a moment.");
    }
  };

  const handleCreate = () => {
    if (!isAuthenticated) {
      router.push("/(auth)/login" as never);
      return;
    }
    if (!roomName.trim()) {
      Alert.alert("Add a room name", "Enter the room name before you continue.");
      return;
    }
    if (!selectedTag.trim()) {
      Alert.alert("Pick a room tag", "Select a room tag so your audience knows what the room is about.");
      return;
    }

    if (mode === "live") {
      startLiveSession.mutate({
        roomName: roomName.trim(),
        category: selectedTag.trim(),
        title: headline.trim() || roomName.trim(),
        roomType: "PUBLIC",
        streamType: "SOLO",
      });
      return;
    }

    createPartyRoom.mutate({
      roomName: roomName.trim(),
      description: `${selectedTag} · ${headline.trim() || selectedMode.label}`,
      roomType: mode === "videoParty" ? "VIP" : "PUBLIC",
      maxSeats,
      maxAudience,
      seatLayoutType: mode === "videoParty" ? "GRID" : "CIRCLE",
      entryFeeCoins: mode === "videoParty" && selectedTheme?.isPremium ? Math.max(0, Number(selectedTheme.coinPrice ?? 0)) : 0,
      themeId: selectedTheme?.id,
      isPersistent: false,
    });
  };

  const creatorCtaLabel = talentRole === "HOST" || talentRole === "MODEL"
    ? `Official Talent · Lv.${Math.max(talentLevel, 1)}`
    : "Official Talent";

  const themeGradient = Array.isArray(selectedTheme?.colorSchemeJson?.colors)
    ? ((selectedTheme?.colorSchemeJson?.colors as string[]).slice(0, 2) as [string, string])
    : selectedMode.accent;

  return (
    <View style={{ flex: 1, backgroundColor: "#091235" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(10,15,52,0.28)", "rgba(8,14,47,0.78)", "#091235"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={12} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120, paddingHorizontal: SPACING.md }}>
        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>Live Center</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
            Create a broadcast, launch a party room, or swap room skins using live backend data from streams, party themes, wallet balance, and user levels.
          </Text>
        </View>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 18 }}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
            <ModeTab label="Live" active={mode === "live"} onPress={() => setMode("live")} />
            <ModeTab label="Chat Party" active={mode === "chatParty"} onPress={() => setMode("chatParty")} />
            <ModeTab label="Video Party" active={mode === "videoParty"} onPress={() => setMode("videoParty")} />
          </View>

          <LinearGradient colors={[`${themeGradient[0]}E6`, `${themeGradient[1]}CC`]} style={{ borderRadius: 26, overflow: "hidden", marginBottom: 18 }}>
            <ImageBackground source={selectedTheme?.backgroundAssetUrl ? { uri: selectedTheme.backgroundAssetUrl } : undefined} style={{ padding: 18 }} imageStyle={{ opacity: 0.22 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800", letterSpacing: 0.8 }}>{selectedMode.eyebrow.toUpperCase()}</Text>
                  <Text style={{ color: COLORS.white, fontSize: 25, fontWeight: "900", marginTop: 8 }}>{selectedMode.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 20, marginTop: 8 }}>{selectedMode.subtitle}</Text>
                </View>
                <Avatar uri={avatarUrl} size={74} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{displayName}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 13, marginTop: 4 }}>{locationLabel}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.92} onPress={handleShare} style={{ borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }}>
                  <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "800" }}>Share</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                <InfoChip label={`User Lv.${Math.max(userLevel, 1)}`} />
                <InfoChip label={`Talent Lv.${Math.max(talentLevel, 0)}`} />
                <InfoChip label={`${maxSeats} seats`} />
                <InfoChip label={`${maxAudience}+ audience`} />
              </View>
            </ImageBackground>
          </LinearGradient>

          {!avatarUrl ? (
            <View style={{ borderRadius: 18, padding: 14, backgroundColor: "rgba(255,213,106,0.12)", borderWidth: 1, borderColor: "rgba(255,213,106,0.26)", marginBottom: 12 }}>
              <Text style={{ color: "#FFE39A", fontSize: 13, fontWeight: "800" }}>Upload an avatar to make the room feel more official.</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 6 }}>Your creator card already supports profile editing, so this warning disappears once your avatar is saved.</Text>
            </View>
          ) : null}

          {myActiveStream.data && mode === "live" ? (
            <View style={{ borderRadius: 20, padding: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 8 }}>
              <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>You are live right now</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6, lineHeight: 20 }}>
                {myActiveStream.data.title} · {Number(myActiveStream.data.viewerCount ?? 0)} viewers · {Number(myActiveStream.data.giftRevenueCoins ?? 0)} coins
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button title="Open Room" onPress={() => router.push(`/stream/${myActiveStream.data.streamId}` as never)} style={{ flex: 1 }} />
                <Button title="End Live" variant="danger" loading={endStream.isPending} onPress={() => endStream.mutate({ streamId: myActiveStream.data.streamId, reason: "NORMAL" })} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}

          <DarkField label="Room Title" value={roomName} onChangeText={setRoomName} placeholder={`${displayName}'s room`} />
          <DarkField label="Headline" value={headline} onChangeText={setHeadline} placeholder="Tell guests what they can expect" multiline />

          <View style={{ marginTop: 18 }}>
            <SectionTitle title="Room Tag" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {categoryChips.map((chip) => (
                <InfoChip key={chip} label={chip} active={selectedTag === chip} onPress={() => setSelectedTag(chip)} />
              ))}
            </View>
          </View>

          <View style={{ marginTop: 22 }}>
            <SectionTitle title="Room Skin" action="Mine / Store" onPress={() => setSheetOpen(true)} />
            {selectedTheme ? (
              <View style={{ borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)" }}>
                <ImageBackground source={selectedTheme.backgroundAssetUrl ? { uri: selectedTheme.backgroundAssetUrl } : undefined} style={{ padding: 18 }} imageStyle={{ opacity: 0.28 }}>
                  <LinearGradient colors={["rgba(12,19,69,0.12)", "rgba(12,19,69,0.72)"]} style={{ position: "absolute", inset: 0 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>{selectedTheme.themeName}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                        {selectedTheme.description || "Switch your room style before you open the room."}
                      </Text>
                    </View>
                    <Badge text={selectedTheme.isPremium ? "Premium" : "Default"} color={selectedTheme.isPremium ? "#FFD56A" : "#7AE6B8"} />
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                    <InfoChip label={selectedTheme.coinPrice ? `${selectedTheme.coinPrice.toLocaleString()} coins` : "0 coins"} />
                    {selectedTheme.seasonTag ? <InfoChip label={String(selectedTheme.seasonTag)} /> : null}
                    <InfoChip label={selectedTheme.isPremium ? (canUsePremiumTry ? "Try enabled" : "Lv.7 required") : "Free access"} />
                  </View>
                </ImageBackground>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16 }}>
              {(themeList.length > 0 ? themeList : []).map((item) => (
                <ThemeCard
                  key={item.id}
                  item={item}
                  selected={selectedThemeId === item.id}
                  unlocked={unlockedThemeSet.has(item.id)}
                  canTry={canUsePremiumTry || !item.isPremium}
                  onUse={() => selectTheme(item.id)}
                  onTry={() => tryTheme(item)}
                  onBuy={() => handlePurchaseTheme(item)}
                />
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.push("/creator-dashboard" as never)}
            style={{ marginTop: 22, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>{creatorCtaLabel}</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 19, marginTop: 6 }}>
                {talentRole === "HOST" || talentRole === "MODEL"
                  ? "Open the creator dashboard to manage availability, creator level, and demo assets."
                  : "Upgrade into the creator flow and prepare your profile for official hosting opportunities."}
              </Text>
            </View>
            <Text style={{ color: "#B8C8FF", fontSize: 14, fontWeight: "800" }}>Open</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 22, flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, borderRadius: 20, padding: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "700" }}>Wallet</Text>
              <View style={{ marginTop: 8 }}>
                <CoinDisplay amount={currentCoins} size="md" />
              </View>
            </View>
            <View style={{ flex: 1, borderRadius: 20, padding: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "700" }}>Access Gate</Text>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginTop: 8 }}>{canUsePremiumTry ? "Unlocked" : "Level 7+"}</Text>
            </View>
          </View>

          <View style={{ marginTop: 22 }}>
            <Button
              title={isAuthenticated ? selectedMode.cta : "Sign In To Continue"}
              onPress={handleCreate}
              loading={startLiveSession.isPending || createPartyRoom.isPending}
            />
          </View>
        </Card>

        <View style={{ marginTop: 10 }}>
          <SectionTitle title="Live Now" />
          {streamList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
              {streamList.slice(0, 8).map((item) => (
                <StreamPreviewCard
                  key={String(item.streamId)}
                  item={item}
                  canChallenge={Boolean(canChallenge && item.hostUserId && item.hostUserId !== userId)}
                  onChallenge={() => requestPkBattle.mutate({ opponentHostId: String(item.hostUserId) })}
                />
              ))}
            </ScrollView>
          ) : (
            <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <EmptyState icon="📺" title="No live streams yet" subtitle="The broadcast feed will populate as soon as creators start sessions." />
            </Card>
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionTitle title="Active Party Rooms" />
          {isAuthenticated ? (
            partyList.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {partyList.map((item) => <PartyPreviewCard key={String(item.id)} item={item} />)}
              </ScrollView>
            ) : (
              <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <EmptyState icon="🎤" title="No party rooms open" subtitle="Create one above and the app will route you into the live room immediately." />
              </Card>
            )
          ) : (
            <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>Sign in to view active parties</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
                Party room listing is protected by the existing party router, so guests can design a room here but need an account to enter one.
              </Text>
              <Button title="Go to Login" onPress={() => router.push("/(auth)/login" as never)} style={{ marginTop: 14 }} />
            </Card>
          )}
        </View>

        {(activeCategories.length > 0 || categoryChips.length > 0) ? (
          <View style={{ marginTop: 18 }}>
            <SectionTitle title="Hot Tags" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[...new Set([...categoryChips, ...activeCategories])].slice(0, 10).map((tag) => (
                <InfoChip key={tag} label={tag} active={selectedTag === tag} onPress={() => setSelectedTag(tag)} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="slide" transparent visible={sheetOpen} onRequestClose={() => setSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(5,10,30,0.74)" }}>
          <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#111A4C", paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 20, maxHeight: "78%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Room Skins</Text>
              <Pressable onPress={() => setSheetOpen(false)} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>×</Text>
              </Pressable>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 6, marginBottom: 14 }}>Swap between free skins, premium weekly styles, and recently unlocked room themes.</Text>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <ModeTab label={`Mine (${mineThemes.length})`} active={sheetTab === "mine"} onPress={() => setSheetTab("mine")} />
              <ModeTab label={`Store (${storeThemes.length})`} active={sheetTab === "store"} onPress={() => setSheetTab("store")} />
            </View>

            <View style={{ borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 14 }}>
              <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "700" }}>Available Coins</Text>
              <View style={{ marginTop: 8 }}>
                <CoinDisplay amount={currentCoins} size="lg" />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {skinSheetThemes.length > 0 ? (
                skinSheetThemes.map((item) => (
                  <ThemeCard
                    key={`${sheetTab}-${item.id}`}
                    item={item}
                    selected={selectedThemeId === item.id}
                    unlocked={unlockedThemeSet.has(item.id)}
                    canTry={canUsePremiumTry || !item.isPremium}
                    onUse={() => {
                      selectTheme(item.id);
                      setSheetOpen(false);
                    }}
                    onTry={() => tryTheme(item)}
                    onBuy={() => handlePurchaseTheme(item)}
                  />
                ))
              ) : (
                <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                  <EmptyState icon={sheetTab === "mine" ? "🎨" : "🛍️"} title={sheetTab === "mine" ? "No owned skins yet" : "Store is empty"} subtitle={sheetTab === "mine" ? "Buy or unlock a premium theme and it will show up here." : "No extra room skins are currently published."} />
                </Card>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={gateOpen} onRequestClose={() => setGateOpen(false)}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(6,10,28,0.72)" }}>
          <View style={{ width: "100%", borderRadius: 26, backgroundColor: "#111A4C", padding: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Feature Locked</Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 10, lineHeight: 22 }}>
              Wealth Level 7+ users or Talents above Level 7 can use this feature.
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 8, lineHeight: 20 }}>
              Your current access is User Lv.{Math.max(userLevel, 1)} and Talent Lv.{Math.max(talentLevel, 0)}.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <Button title="Close" variant="secondary" onPress={() => setGateOpen(false)} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
              <Button title="Open Creator" onPress={() => { setGateOpen(false); router.push("/creator-dashboard" as never); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
