import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { DynamicHomeLayout } from "@/components/dynamic-layout";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useWalletStore } from "@/store";
import { getMobileLayoutScope } from "@/lib/runtime-config";

type HomeCard = {
  id: string;
  title: string;
  subtitle: string;
  viewers: string;
  badge: string;
  accent?: string;
  imageUri?: string | null;
  route: string;
};

function PromoBanner({ banner, onPress }: { banner: any; onPress: () => void }) {
  const hasImage = typeof banner.imageUrl === "string" && banner.imageUrl.length > 0;

  if (hasImage) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width: 320, height: 132, marginRight: SPACING.sm, borderRadius: 18, overflow: "hidden" }}>
        <ImageBackground source={{ uri: banner.imageUrl }} style={{ flex: 1, justifyContent: "space-between" }}>
          <LinearGradient colors={["rgba(7,11,31,0.14)", "rgba(7,11,31,0.82)"]} style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
            <Badge text="Featured" color="#FFE18F" />
            <View>
              <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }} numberOfLines={2}>{String(banner.title ?? "Campaign")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 4 }}>Tap to open</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ width: 320, height: 132, marginRight: SPACING.sm, borderRadius: 18, overflow: "hidden" }}>
      <LinearGradient colors={["#4730A6", "#1C1C5A"]} style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
        <Badge text="Featured" color="#FFE18F" />
        <View>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "800" }} numberOfLines={2}>{String(banner.title ?? "Campaign")}</Text>
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 4 }}>Tap to open</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ShowcaseCard({ item }: { item: HomeCard }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(item.route as never)}
      style={{ width: "48%", marginBottom: SPACING.md, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.1)" }}
    >
      {item.imageUri ? (
        <ImageBackground source={{ uri: item.imageUri }} style={{ height: 230, justifyContent: "space-between" }} imageStyle={{ borderRadius: 18 }}>
          <LinearGradient colors={["rgba(7,10,33,0.08)", "rgba(7,10,33,0.76)"]} style={{ flex: 1, justifyContent: "space-between", padding: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Badge text={item.badge} color="#79B8FF" />
              <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "700" }}>{item.viewers}</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, marginTop: 4 }} numberOfLines={1}>{item.subtitle}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={[item.accent ?? "#4F3DB7", "#171E58"]} style={{ height: 230, padding: 12, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Badge text={item.badge} color="#C0D8FF" />
            <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "700" }}>{item.viewers}</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>{item.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, marginTop: 4 }} numberOfLines={1}>{item.subtitle}</Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

function CuratedHomeFeed({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeCategory, setActiveCategory] = useState("Popular");
  const bannerQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });
  const liveQuery = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const recommendedQuery = trpc.discovery.getModelRecommendations.useQuery({ limit: 6 }, { retry: false, enabled: isAuthenticated });

  const recommended = (recommendedQuery.data ?? []) as any[];
  const liveStreams = (liveQuery.data?.streams ?? []) as any[];
  const banners = (bannerQuery.data ?? []) as any[];
  const sections = ["Freshers", "Popular", "Spotlight", "Party", "PK Matches"];

  const openBanner = (banner: any) => {
    const target = String(banner.linkTarget ?? "");
    if (!target) return;
    if (banner.linkType === "MODEL_PROFILE") {
      router.push(`/profile/${target}`);
      return;
    }
    if (target.startsWith("/")) {
      router.push(target as any);
    }
  };

  const cards = useMemo<HomeCard[]>(() => {
    const liveCards = liveStreams.map((stream, index) => ({
      id: `live-${String(stream.streamId)}`,
      title: String(stream.displayName ?? stream.hostDisplayName ?? stream.title ?? "Live"),
      subtitle: String(stream.title ?? stream.category ?? "Live room"),
      viewers: `${Number(stream.viewerCount ?? 0).toLocaleString()} `,
      badge: index % 2 === 0 ? "Rising Star" : "PK",
      imageUri: stream.avatarUrl ?? null,
      accent: index % 2 === 0 ? "#5037B7" : "#2B6BCB",
      route: `/stream/${stream.streamId}`,
    }));
    const recommendedCards = recommended.map((model, index) => ({
      id: `model-${String(model.userId ?? model.modelId)}`,
      title: String(model.displayName ?? "Creator"),
      subtitle: `${Number((model.audioMinutesTotal ?? 0) + (model.videoMinutesTotal ?? 0)).toLocaleString()} mins`,
      viewers: `${Math.max(1, Math.round(Number(model.qualityScore ?? 1) * 100) / 10)}K`,
      badge: index % 2 === 0 ? "Rising Star" : "Spotlight",
      imageUri: model.avatarUrl ?? null,
      accent: index % 2 === 0 ? "#4A35AF" : "#224E96",
      route: `/profile/${model.userId ?? model.modelId}`,
    }));

    const merged = [...recommendedCards, ...liveCards].slice(0, 8);

    switch (activeCategory) {
      case "Freshers":
        return (recommendedCards.length > 0 ? recommendedCards : liveCards).slice(0, 6);
      case "Spotlight":
        return merged.filter((card) => card.badge !== "PK").slice(0, 6);
      case "Party":
        return liveCards.slice(0, 6);
      case "PK Matches":
        return liveCards.filter((card) => card.badge === "PK").slice(0, 6);
      default:
        return merged;
    }
  }, [activeCategory, liveStreams, recommended]);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section}
            onPress={() => setActiveCategory(section)}
            style={{ marginRight: 22, paddingBottom: 4 }}
          >
            <Text style={{ color: activeCategory === section ? COLORS.white : "rgba(255,255,255,0.62)", fontSize: 18, fontWeight: activeCategory === section ? "800" : "500" }}>{section}</Text>
            {activeCategory === section ? <View style={{ marginTop: 6, width: 42, height: 6, borderRadius: 999, backgroundColor: "#61D8FF" }} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {banners.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          {banners.slice(0, 5).map((banner) => <PromoBanner key={String(banner.id)} banner={banner} onPress={() => openBanner(banner)} />)}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 22 }}>🌍</Text>
          <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800" }}>Global</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/discover")} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" }}>
          <MaterialCommunityIcons color="#FFFFFF" name="tune-variant" size={18} />
        </TouchableOpacity>
      </View>

      {(liveQuery.isLoading || (isAuthenticated && recommendedQuery.isLoading)) ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginVertical: SPACING.xl }} />
      ) : cards.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {cards.map((item) => <ShowcaseCard key={item.id} item={item} />)}
        </View>
      ) : (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <Text style={{ color: "rgba(255,255,255,0.76)" }}>No live showcases are available right now.</Text>
        </Card>
      )}

      {!isAuthenticated ? (
        <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginTop: SPACING.sm }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Unlock recommendations and messaging</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Guest mode keeps browsing open, but account-only actions stay protected until you sign in.</Text>
          <Button title="Sign In" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 14, backgroundColor: COLORS.white }} variant="secondary" />
        </Card>
      ) : null}
    </>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const coins = useWalletStore((s) => s.coinBalance);
  const layoutQuery = trpc.config.getUILayout.useQuery({ layoutKey: "home_feed", ...getMobileLayoutScope() }, { retry: false });
  const dynamicSectionCount = Object.keys(layoutQuery.data?.sections ?? {}).length;
  const isAuthenticated = authMode === "authenticated";

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(18,21,71,0.18)", "rgba(10,18,60,0.74)", "rgba(8,14,47,0.96)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={20} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 124 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
          </TouchableOpacity>
          <Pressable onPress={() => router.push("/discover")} style={{ flex: 1, marginHorizontal: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons color="rgba(255,255,255,0.8)" name="magnify" size={20} />
            <Text style={{ color: "rgba(255,255,255,0.72)", marginLeft: 8, fontSize: 16 }}>Search ID</Text>
          </Pressable>
          <TouchableOpacity onPress={() => router.push("/me")} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
            <MaterialCommunityIcons color="#FFFFFF" name="emoticon-happy-outline" size={20} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar size={38} />
            <View>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800" }}>SK Lite</Text>
              <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>Coins {coins.toLocaleString()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/wallet")} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {layoutQuery.isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: SPACING.xl }} />
        ) : null}

        <CuratedHomeFeed isAuthenticated={isAuthenticated} />

        {dynamicSectionCount > 0 ? (
          <View style={{ marginTop: SPACING.sm }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>For You</Text>
            <DynamicHomeLayout config={layoutQuery.data} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
