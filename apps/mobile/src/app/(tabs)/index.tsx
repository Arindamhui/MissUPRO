import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Card, SectionHeader, CoinDisplay, Badge } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useWalletStore } from "@/store";
import { router } from "expo-router";

export default function HomeScreen() {
  const coins = useWalletStore((s) => s.coinBalance);
  const onlineModels = trpc.discovery.onlineModels.useQuery({ limit: 10 }, { retry: false });
  const configBootstrap = trpc.config.getBootstrap.useQuery(undefined, { retry: false });
  const bannersQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });

  const models = (onlineModels.data?.models ?? []) as any[];
  const runtimeConfigCount = (configBootstrap.data?.systemSettings ?? []).length;
  const banners = (bannersQuery.data ?? []) as any[];

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
    <Screen scroll>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.text }}>MissU<Text style={{ color: COLORS.primary }}>PRO</Text></Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/wallet")} style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full }}>
          <CoinDisplay amount={coins} size="sm" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: SPACING.lg }}>
        {[
          { icon: "📺", label: "Live", route: "/(tabs)/live" },
          { icon: "🎉", label: "Party", route: "/events" },
          { icon: "🎙️", label: "Audio", route: "/creator-dashboard" },
          { icon: "🎮", label: "Games", route: "/games" },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            style={{ alignItems: "center" }}
          >
            <View style={{ width: 56, height: 56, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 26 }}>{item.icon}</Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.text, fontWeight: "500" }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {banners.length > 0 && (
        <>
          <SectionHeader title="Campaign Banners" action="Explore" onAction={() => router.push("/(tabs)/discover")} />
          <FlatList
            data={banners}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => openBanner(item)}
                activeOpacity={0.85}
                style={{
                  width: 240,
                  marginRight: SPACING.sm,
                  borderRadius: RADIUS.lg,
                  backgroundColor: COLORS.primary,
                  padding: SPACING.md,
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
                  {item.title}
                </Text>
                <Text style={{ color: COLORS.white, opacity: 0.9, fontSize: 13 }}>
                  {item.linkType === "PROMOTION" ? "Promotion campaign" : "Tap to open"}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={null}
            style={{ marginBottom: SPACING.md }}
          />
        </>
      )}

      {/* Online Models */}
      <SectionHeader title="Online Now" action="See All" onAction={() => router.push("/(tabs)/discover")} />
      <FlatList
        data={models}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/profile/${item.userId ?? item.modelId ?? item.id}`)}
            style={{ alignItems: "center", marginRight: SPACING.md }}
          >
            <Avatar uri={item.avatarUrl ?? item.profileImage} size={72} online />
            <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.text, marginTop: 6 }}>{item.displayName ?? "Model"}</Text>
            <Badge text="Online" color={COLORS.success} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ paddingVertical: SPACING.lg, alignItems: "center" }}>
            <Text style={{ color: COLORS.textSecondary }}>No models online</Text>
          </View>
        }
      />

      {/* Trending */}
      <SectionHeader title="Trending" action="See All" />
      <Card>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Trending content loaded from discovery.trending</Text>
      </Card>

      <SectionHeader title="Runtime Config" action="View" onAction={() => router.push("/settings")} />
      <Card>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
          Loaded {runtimeConfigCount} published system settings from backend config APIs.
        </Text>
      </Card>

      {/* Recommendations */}
      <SectionHeader title="For You" />
      <Card>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Personalized recommendations based on your activity</Text>
      </Card>
    </Screen>
  );
}
