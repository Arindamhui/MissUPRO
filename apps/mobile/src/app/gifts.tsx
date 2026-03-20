import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Button } from "@/components/ui";
import { getMobileRuntimeScope } from "@/lib/runtime-config";
import { trpc } from "@/lib/trpc";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { useAuthStore, useUIStore, useWalletStore } from "@/store";

type Gift = {
  id?: string;
  displayName?: string;
  coinPrice?: number;
  diamondCredit?: number;
  effectTier?: string;
  catalogKey?: string;
  iconUrl?: string | null;
};

type GiftTab = "events" | "3d" | "popular" | "luxury" | "privilege" | "backpack";

const TAB_LABELS: Array<{ key: GiftTab; label: string }> = [
  { key: "events", label: "Events" },
  { key: "3d", label: "3D" },
  { key: "popular", label: "Popular" },
  { key: "luxury", label: "Luxury" },
  { key: "privilege", label: "Privilege" },
  { key: "backpack", label: "Backpack" },
];

const GIFT_EMOJI: Record<GiftTab, string[]> = {
  events: ["🎢", "🐯", "🚗", "💃"],
  "3d": ["🐅", "🦁", "🐘", "💗"],
  popular: ["🍻", "🔫", "🐇", "🎉"],
  luxury: ["🦁", "🐘", "🏡", "✨"],
  privilege: ["🚘", "🌸", "🏮", "💞"],
  backpack: ["👋", "💗", "🎀", "🎊"],
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getGiftContextLabel(context?: string | null) {
  switch (context) {
    case "PK_BATTLE":
      return "PK battle";
    case "LIVE_STREAM":
      return "live room";
    case "VIDEO_CALL":
      return "video call";
    case "VOICE_CALL":
      return "voice call";
    default:
      return context ? String(context).toLowerCase().replaceAll("_", " ") : "selected experience";
  }
}

function classifyGift(gift: Gift, index: number): GiftTab {
  const price = Number(gift.coinPrice ?? 0);
  const tier = String(gift.effectTier ?? "STANDARD").toUpperCase();

  if (price <= 0) return "backpack";
  if (price <= 1_000) return index % 2 === 0 ? "popular" : "events";
  if (tier === "MICRO") return "events";
  if (tier === "STANDARD") return index % 3 === 0 ? "3d" : "popular";
  if (tier === "PREMIUM") return "luxury";
  if (tier === "LEGENDARY") return "privilege";
  return "popular";
}

function formatCoins(value: number) {
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} K`;
  }

  return value.toString();
}

function GiftCard({
  item,
  emoji,
  selected,
  onPress,
}: {
  item: Gift;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: "23%",
        marginBottom: 16,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 78,
          height: 78,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
          borderWidth: 1,
          borderColor: selected ? "rgba(255,132,208,0.86)" : "rgba(255,255,255,0.08)",
        }}
      >
        {item.iconUrl ? (
          <Image source={{ uri: item.iconUrl }} style={{ width: 48, height: 48, borderRadius: 16 }} />
        ) : (
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        )}
      </View>
      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "700", marginTop: 10, textAlign: "center" }} numberOfLines={1}>
        {String(item.displayName ?? "Gift")}
      </Text>
      <Text style={{ color: "#FFD668", fontSize: 13, fontWeight: "800", marginTop: 6 }}>
        {formatCoins(Number(item.coinPrice ?? 0))}
      </Text>
    </TouchableOpacity>
  );
}

export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const catalog = trpc.gift.getActiveCatalog.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
  const giftFlag = trpc.config.evaluateFeatureFlag.useQuery({ key: "gift_sending", ...getMobileRuntimeScope() }, { retry: false });
  const sendGift = trpc.gift.sendGift.useMutation();
  const giftTarget = useUIStore((s) => s.selectedGiftTarget);
  const closeDrawer = useUIStore((s) => s.closeGiftDrawer);
  const coins = useWalletStore((s) => s.coinBalance);
  const [tab, setTab] = useState<GiftTab>("events");
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);

  const items = ((catalog.data?.items ?? catalog.data ?? []) as Gift[]).map((gift, index) => ({
    ...gift,
    id: String(gift.id ?? gift.catalogKey ?? `gift-${index}`),
  }));

  const grouped = useMemo(() => {
    const next: Record<GiftTab, Gift[]> = {
      events: [],
      "3d": [],
      popular: [],
      luxury: [],
      privilege: [],
      backpack: [],
    };

    items.forEach((gift, index) => {
      next[classifyGift(gift, index)].push(gift);
    });

    return next;
  }, [items]);

  const activeItems = grouped[tab];
  const selectedGift = activeItems.find((gift) => String(gift.id) === selectedGiftId)
    ?? items.find((gift) => String(gift.id) === selectedGiftId)
    ?? activeItems[0]
    ?? items[0]
    ?? null;

  const selectedGiftDiamondCredit = useMemo(() => {
    if (!selectedGift) return 0;
    const policy = creatorEconomy.data;
    if (!policy) return Number(selectedGift.diamondCredit ?? 0);
    if ((selectedGift.diamondCredit ?? 0) > 0) return Number(selectedGift.diamondCredit ?? 0);

    return Math.max(
      0,
      Math.round(
        Number(selectedGift.coinPrice ?? 0)
          * (policy.diamondConversion.diamonds / Math.max(1, policy.diamondConversion.coins))
          * (1 - policy.commission.platformCommissionPercent / 100),
      ),
    );
  }, [creatorEconomy.data, selectedGift]);

  const handleSendGift = () => {
    if (!selectedGift) return;

    if (!giftTarget) {
      Alert.alert("No target", "Open the gift panel from a live room, profile, or call to choose who should receive the gift.");
      return;
    }

    if (Number(selectedGift.coinPrice ?? 0) > Number(coins ?? 0)) {
      Alert.alert("Insufficient coins", "Your balance is too low for this gift. Open top up and recharge first.");
      return;
    }

    sendGift.mutate({
      giftId: String(selectedGift.id ?? selectedGift.catalogKey ?? ""),
      receiverUserId: giftTarget.userId,
      contextType: giftTarget.context as any,
      contextId: giftTarget.roomId ?? "",
      idempotencyKey: `gift-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }, {
      onSuccess: () => {
        Alert.alert("Gift sent", `${selectedGift.displayName ?? "Gift"} was sent successfully.`);
        void catalog.refetch();
      },
      onError: (error: unknown) => Alert.alert("Gift failed", getErrorMessage(error, "Unable to send gift.")),
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#18052D" }}>
        <StatusBar style="light" />
        <BackgroundCollage variant="home" />
        <LinearGradient colors={["rgba(24,5,45,0.4)", "rgba(16,8,36,0.9)", "#12051F"]} style={{ position: "absolute", inset: 0 }} />
        <AnimatedSnow density={8} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "900" }}>Sign in to open the gift shop</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", lineHeight: 22, textAlign: "center", marginTop: 10 }}>
            Gift sending uses your live wallet balance and creator economy rules, so this section stays protected.
          </Text>
          <Button title="Go to login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 18, width: "100%" }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#22052F" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(40,7,52,0.18)", "rgba(28,8,44,0.84)", "#17041E"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={10} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: SPACING.md, paddingBottom: 36 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>Gift Gallery</Text>
            <Text style={{ color: "rgba(255,255,255,0.58)", marginTop: 2 }}>Choose from live backend gifts and send instantly.</Text>
          </View>
          <TouchableOpacity onPress={closeDrawer} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="close" size={22} />
          </TouchableOpacity>
        </View>

        {giftTarget ? (
          <LinearGradient colors={["#2A1137", "#291447"]} style={{ borderRadius: 22, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "#A2F0FF", fontSize: 13, fontWeight: "700" }}>
              Sending to {getGiftContextLabel(giftTarget.context)}
            </Text>
            <Text style={{ color: COLORS.white, marginTop: 6, fontSize: 15, fontWeight: "700" }}>Receiver ID: {giftTarget.userId}</Text>
          </LinearGradient>
        ) : null}

        <LinearGradient colors={["#FF55C8", "#FF8F80", "#FFC464"]} style={{ borderRadius: 28, padding: 20, marginBottom: 18 }}>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", textAlign: "center" }}>Special Gift Packages</Text>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 6 }}>On Sale</Text>
          <View style={{ borderRadius: 24, backgroundColor: "rgba(255,255,255,0.78)", padding: 18, marginTop: 18 }}>
            <Text style={{ color: "#7A1C2E", fontSize: 20, fontWeight: "900", textAlign: "center" }}>
              Value {Number(selectedGift?.coinPrice ?? 0).toLocaleString() || "0"}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 28 }}>🫘</Text>
                <Text style={{ color: "#FF6B4A", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{Number(selectedGift?.coinPrice ?? 0).toLocaleString()}</Text>
                <Text style={{ color: "#544A58", marginTop: 4 }}>Bean</Text>
              </View>
              <View style={{ width: 54, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons color="#FFAA4F" name="arrow-up-bold-circle" size={42} />
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 28 }}>🎉</Text>
                <Text style={{ color: "#FF3A6A", fontSize: 26, fontWeight: "900", marginTop: 6 }}>{selectedGiftDiamondCredit.toLocaleString()}</Text>
                <Text style={{ color: "#544A58", marginTop: 4 }}>Diamond credit</Text>
              </View>
            </View>

            <LinearGradient colors={["#FFB44A", "#FF5AB8"]} style={{ borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 20 }}>
              <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900" }}>{selectedGift ? selectedGift.coinPrice ? `₹${Math.max(110, Math.round(Number(selectedGift.coinPrice) / 185)).toFixed(2)}` : "₹110.00" : "₹110.00"}</Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, marginTop: 4 }}>Pay by Google</Text>
            </LinearGradient>
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {TAB_LABELS.map((entry) => {
            const active = entry.key === tab;
            return (
              <TouchableOpacity key={entry.key} onPress={() => setTab(entry.key)} style={{ marginRight: 22, paddingBottom: 8, borderBottomWidth: 3, borderBottomColor: active ? "#69E6FF" : "transparent" }}>
                <Text style={{ color: active ? "#8BEFFF" : "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: active ? "800" : "600" }}>{entry.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 4 }}>
          {activeItems.length > 0 ? activeItems.map((item, index) => (
            <GiftCard
              key={String(item.id)}
              item={item}
              emoji={GIFT_EMOJI[tab][index % GIFT_EMOJI[tab].length] ?? "🎁"}
              selected={String(selectedGift?.id) === String(item.id)}
              onPress={() => setSelectedGiftId(String(item.id))}
            />
          )) : (
            <View style={{ width: "100%", borderRadius: 24, padding: 24, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", textAlign: "center" }}>No gifts in this category yet</Text>
              <Text style={{ color: "rgba(255,255,255,0.62)", textAlign: "center", lineHeight: 21, marginTop: 8 }}>
                This category is still powered by the active gift catalog, but nothing currently maps into it.
              </Text>
            </View>
          )}
        </View>

        {selectedGift ? (
          <View style={{ borderRadius: 26, padding: 18, backgroundColor: "rgba(0,0,0,0.24)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginTop: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "900" }}>{String(selectedGift.displayName ?? "Gift")}</Text>
                <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 4 }}>
                  {String(selectedGift.effectTier ?? "STANDARD")} tier · {Number(selectedGift.coinPrice ?? 0).toLocaleString()} coins
                </Text>
              </View>
              <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: "#FFD668", fontWeight: "800" }}>{selectedGiftDiamondCredit} diamond</Text>
              </View>
            </View>

            {giftFlag.data?.enabled === false ? (
              <Text style={{ color: "#FFB7D7", marginTop: 14 }}>Gift sending is disabled for this app configuration.</Text>
            ) : null}

            <Button
              title={giftTarget ? "Send" : "Select a live target first"}
              onPress={handleSendGift}
              disabled={!giftTarget || giftFlag.data?.enabled === false || Number(selectedGift.coinPrice ?? 0) > Number(coins ?? 0)}
              loading={sendGift.isPending}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}