import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, CoinDisplay, Avatar, Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DynamicHomeLayout } from "@/components/dynamic-layout";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useWalletStore } from "@/store";
import { router } from "expo-router";
import { getMobileLayoutScope } from "@/lib/runtime-config";

function CuratedHomeFeed() {
  const recommendedQuery = trpc.discovery.getModelRecommendations.useQuery({ limit: 6 }, { retry: false });
  const liveQuery = trpc.discovery.getTrendingStreams.useQuery({ limit: 6 }, { retry: false });
  const bannerQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });

  const recommended = (recommendedQuery.data ?? []) as any[];
  const liveStreams = (liveQuery.data ?? []) as any[];
  const banners = (bannerQuery.data ?? []) as any[];

  const openBanner = (banner: any) => {
    const target = String(banner.linkTarget ?? "");
    if (banner.linkType === "MODEL_PROFILE" && target) {
      router.push(`/profile/${target}`);
      return;
    }
    if (target.startsWith("/")) {
      router.push(target as any);
    }
  };

  return (
    <>
      <View
        style={{
          borderRadius: 28,
          padding: 20,
          marginBottom: SPACING.lg,
          backgroundColor: "#121C37",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(117,96,240,0.22)",
            top: -80,
            right: -40,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(38,196,255,0.14)",
            bottom: -70,
            left: -50,
          }}
        />
        <Badge text="Live every day" color="#8EDB92" />
        <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.white, marginTop: 14 }}>
          Meet creators, join live rooms, and start private calls.
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 21, marginTop: 10 }}>
          Your home feed now highlights online talent, trending live sessions, and fast ways to spend coins without any admin controls in the app.
        </Text>
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: 18 }}>
          <Button title="Explore Models" variant="secondary" onPress={() => router.push("/discover")} style={{ flex: 1, backgroundColor: COLORS.white }} />
          <Button title="Go Live" variant="outline" onPress={() => router.push("/live")} style={{ flex: 1, borderColor: "rgba(255,255,255,0.35)" }} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
        {[
          { title: "Wallet", subtitle: "Top up coins", href: "/wallet", accent: "#FFF1B3" },
          { title: "Messages", subtitle: "Reply faster", href: "/messages", accent: "#D7F5FF" },
          { title: "Gifts", subtitle: "Send support", href: "/gifts", accent: "#FFD7E6" },
        ].map((item) => (
          <TouchableOpacity
            key={item.title}
            onPress={() => router.push(item.href as any)}
            style={{
              flex: 1,
              borderRadius: RADIUS.lg,
              backgroundColor: COLORS.card,
              padding: SPACING.md,
              minHeight: 96,
              justifyContent: "space-between",
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: item.accent }} />
            <View>
              <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 15 }}>{item.title}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {banners.length > 0 ? (
        <>
          <SectionHeader title="Featured" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
            {banners.slice(0, 5).map((banner) => (
              <TouchableOpacity
                key={String(banner.id)}
                onPress={() => openBanner(banner)}
                activeOpacity={0.9}
                style={{
                  width: 260,
                  marginRight: SPACING.sm,
                  borderRadius: 22,
                  padding: SPACING.lg,
                  backgroundColor: COLORS.card,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "700" }}>{banner.title}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>
                  {banner.linkType === "MODEL_PROFILE" ? "Open featured creator" : "Open campaign"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="Trending Live" action="See all" onAction={() => router.push("/live")} />
      {liveQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
      ) : liveStreams.length > 0 ? (
        liveStreams.map((stream) => (
          <TouchableOpacity
            key={String(stream.streamId)}
            onPress={() => router.push(`/stream/${stream.streamId}`)}
            style={{
              marginBottom: SPACING.sm,
              padding: SPACING.md,
              borderRadius: RADIUS.lg,
              backgroundColor: COLORS.card,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.md,
            }}
          >
            <Avatar uri={stream.avatarUrl ?? undefined} size={58} online />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                {stream.title ?? "Live session"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                {stream.displayName ?? "Host"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Badge text={`${Number(stream.viewerCount ?? 0)} watching`} color={COLORS.danger} />
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>No one is live right now. Check again soon.</Text>
        </Card>
      )}

      <SectionHeader title="Recommended For You" action="Browse" onAction={() => router.push("/discover")} />
      {recommendedQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
      ) : recommended.length > 0 ? (
        recommended.map((model) => (
          <TouchableOpacity
            key={String(model.modelId ?? model.userId)}
            onPress={() => router.push(`/profile/${model.userId ?? model.modelId}`)}
            style={{
              marginBottom: SPACING.sm,
              padding: SPACING.md,
              borderRadius: RADIUS.lg,
              backgroundColor: COLORS.card,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.md,
            }}
          >
            <Avatar uri={model.avatarUrl ?? undefined} size={62} online />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                {model.displayName ?? "Creator"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>
                {(Number(model.audioMinutesTotal ?? 0) + Number(model.videoMinutesTotal ?? 0)).toLocaleString()} mins completed
              </Text>
            </View>
            <Button title="View" size="sm" onPress={() => router.push(`/profile/${model.userId ?? model.modelId}`)} />
          </TouchableOpacity>
        ))
      ) : (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>Recommendations will appear here after discovery data is available.</Text>
        </Card>
      )}
    </>
  );
}

export default function HomeScreen() {
  const coins = useWalletStore((s) => s.coinBalance);
  const layoutQuery = trpc.config.getUILayout.useQuery({ layoutKey: "home_feed", ...getMobileLayoutScope() }, { retry: false });
  const dynamicSectionCount = Object.keys(layoutQuery.data?.sections ?? {}).length;

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.text }}>MissU<Text style={{ color: COLORS.primary }}>PRO</Text></Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/wallet")} style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full }}>
          <CoinDisplay amount={coins} size="sm" />
        </TouchableOpacity>
      </View>

      {layoutQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : dynamicSectionCount > 0 ? (
        <DynamicHomeLayout config={layoutQuery.data} />
      ) : (
        <CuratedHomeFeed />
      )}
    </Screen>
  );
}
