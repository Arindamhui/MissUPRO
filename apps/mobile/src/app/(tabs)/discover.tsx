import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Badge, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { router } from "expo-router";
import { useAuthStore } from "@/store";

export default function DiscoverScreen() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.authMode === "authenticated");

  const results = trpc.discovery.searchModels.useQuery(
    { query: search || undefined, gender: filter as any, limit: 20 },
    { retry: false, enabled: isAuthenticated },
  );
  const trending = trpc.discovery.getOnlineModels.useQuery({ limit: 10 }, { retry: false, enabled: isAuthenticated });
  const bannersQuery = trpc.cms.listPublicBanners.useQuery(undefined, { retry: false });

  const models = (results.data?.items ?? []) as any[];
  const trendingModels = (trending.data?.items ?? []) as any[];
  const banners = (bannersQuery.data ?? []) as any[];

  const filters = [
    { key: null, label: "All" },
    { key: "female", label: "Women" },
    { key: "male", label: "Men" },
    { key: "non_binary", label: "Non-Binary" },
  ];

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
    <Screen>
      {/* Search Bar */}
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search models..."
          placeholderTextColor={COLORS.textSecondary}
          style={{
            backgroundColor: COLORS.inputBg, borderRadius: RADIUS.lg,
            paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4,
            fontSize: 15, color: COLORS.text,
          }}
        />
      </View>

      {/* Filter Chips */}
      <View style={{ flexDirection: "row", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm }}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key ?? "all"}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
              backgroundColor: filter === f.key ? COLORS.primary : COLORS.surface,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: filter === f.key ? COLORS.white : COLORS.text }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Model Grid */}
      <FlatList
        data={models}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.sm }}
        columnWrapperStyle={{ gap: SPACING.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/profile/${item.userId ?? item.modelId ?? item.id}`)}
            style={{
              flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
              overflow: "hidden", marginBottom: SPACING.sm,
              shadowColor: COLORS.black, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
            }}
          >
            <View style={{ height: 180, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" }}>
              <Avatar uri={item.avatarUrl ?? item.profileImage} size={80} online={item.isOnline} />
            </View>
            <View style={{ padding: SPACING.sm }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>{item.displayName ?? "Model"}</Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                {item.isOnline && <Badge text="Online" color={COLORS.success} />}
                <Badge text={`Lv.${item.level ?? 1}`} color={COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          !search ? (
            <>
              {banners.length > 0 && (
                <>
                  <SectionHeader title="Featured Campaigns" />
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
                          width: 220,
                          marginRight: SPACING.sm,
                          borderRadius: RADIUS.lg,
                          backgroundColor: COLORS.card,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          padding: SPACING.md,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>{item.title}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>
                          {item.linkType === "PROMOTION" ? "Promotion" : "Open banner"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={{ marginBottom: SPACING.md }}
                  />
                </>
              )}
              <SectionHeader title="🔥 Trending" />
              {isAuthenticated ? (
                <FlatList
                  data={trendingModels}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id ?? item.modelId ?? item.userId}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => router.push(`/profile/${item.userId ?? item.modelId ?? item.id}`)}
                      style={{ width: 120, marginRight: SPACING.sm, alignItems: "center" }}
                    >
                      <Avatar uri={item.avatarUrl ?? item.profileImage} size={64} online />
                      <Text style={{ fontSize: 13, fontWeight: "500", marginTop: 6 }}>{item.displayName ?? "Model"}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ marginBottom: SPACING.md }}
                />
              ) : (
                <View style={{ paddingVertical: SPACING.md }}>
                  <Text style={{ color: COLORS.textSecondary }}>Sign in to browse personalized discovery results.</Text>
                </View>
              )}
              <SectionHeader title="All Models" />
            </>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: SPACING.xxl }}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.sm }}>🔍</Text>
            <Text style={{ color: COLORS.textSecondary }}>{isAuthenticated ? "No models found" : "Sign in to search models"}</Text>
          </View>
        }
      />
    </Screen>
  );
}
