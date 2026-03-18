import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarBubble, CrownBadge, InfoBanner } from "@/components/leaderboards/showcase";
import { getMobileRuntimeScope } from "@/lib/runtime-config";
import {
  buildPreviewEntries,
  CARD_PRESETS,
  getFlagKey,
  mapBoardsToPresets,
  mapConfigsToPresets,
  type Leaderboard,
  type LeaderboardConfig,
  type LeaderboardEntry,
  type ShowcaseCard,
} from "@/lib/leaderboards-showcase";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";

const SCREEN_BG = "#0A1019";
const PANEL_BG = "#0F1723";
const PANEL_BORDER = "rgba(255,255,255,0.07)";

function TopRankPreview({ entries }: { entries: LeaderboardEntry[] }) {
  const podium = [entries[1], entries[0], entries[2]];
  const heights = [78, 118, 70];
  const colors = ["#8561FF", "#FFCC4D", "#FFB983"] as const;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 18 }}>
      {podium.map((entry, index) => {
        const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
        return (
          <View key={`podium-${rank}`} style={{ width: rank === 1 ? "42%" : "26%", alignItems: "center" }}>
            <CrownBadge tone={rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze"} size={rank === 1 ? 24 : 18} />
            <View style={{ marginTop: 4 }}>
              <AvatarBubble entry={entry} size={rank === 1 ? 86 : 62} fallbackColor={colors[index]} />
            </View>
            <View style={{ width: "100%", height: heights[index], marginTop: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: "900" }}>TOP {rank}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OverlapAvatars({ entries, accentColor }: { entries: LeaderboardEntry[]; accentColor: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {entries.slice(0, 3).map((entry, index) => (
        <View key={`${entry.userId ?? index}`} style={{ marginLeft: index === 0 ? 0 : -10 }}>
          <AvatarBubble entry={entry} size={50} fallbackColor={accentColor} />
        </View>
      ))}
    </View>
  );
}

function FeatureCard({ item, previewEntries }: { item: ShowcaseCard; previewEntries: LeaderboardEntry[] }) {
  const { preset, board } = item;
  const isWeeklyStar = preset.key === "weekly-star";
  const isRecordBreaker = preset.key === "record-breaker";
  const sizeStyle: ViewStyle = preset.layout === "hero"
    ? { width: "47.6%", height: 448 }
    : preset.layout === "wide"
      ? { width: "100%", height: isWeeklyStar ? 156 : 140 }
      : preset.layout === "tall"
        ? { width: "47.6%", height: 260 }
        : { width: "100%", height: isRecordBreaker ? 168 : 152 };

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={() => router.push(`/leaderboards/${preset.key}` as never)} style={[sizeStyle, { marginBottom: 14 }]}>
      <LinearGradient colors={preset.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 28, borderWidth: 1, borderColor: board ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)", overflow: "hidden", padding: 16 }}>
        <View style={{ position: "absolute", inset: 0, opacity: 0.12 }}>
          <View style={{ position: "absolute", top: -16, right: -10, width: 110, height: 110, borderRadius: 55, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", bottom: 18, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFFFFF" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
            <MaterialCommunityIcons color="#FFFFFF" name={preset.icon} size={22} />
            <Text style={{ color: "#FFFFFF", fontSize: preset.layout === "hero" ? 22 : 18, fontWeight: "900", marginLeft: 10 }} numberOfLines={1}>{preset.title}</Text>
          </View>
          {preset.accent ? <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 18, fontWeight: "900" }}>{preset.accent}</Text> : null}
        </View>

        <View style={{ flex: 1, justifyContent: "space-between", marginTop: isWeeklyStar || isRecordBreaker ? 16 : 10 }}>
          {preset.layout === "hero" ? <TopRankPreview entries={previewEntries} /> : null}
          {preset.layout === "wide" ? (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingTop: isWeeklyStar ? 4 : 0, paddingRight: 12 }}>
                {previewEntries.slice(0, isWeeklyStar ? 4 : 5).map((entry, index) => (
                  <Text
                    key={`${entry.userId ?? index}`}
                    style={{ color: index === 0 ? "#FFEAA0" : "#FFFFFF", fontSize: index === 0 ? 16 : 12, lineHeight: index === 0 ? 19 : 15, fontWeight: index === 0 ? "900" : "700", marginBottom: 3 }}
                    numberOfLines={1}
                  >
                    {entry.displayName ?? `Gift ${index + 1}`}
                  </Text>
                ))}
              </View>
              <OverlapAvatars entries={previewEntries} accentColor={preset.colors[0]} />
            </View>
          ) : null}
          {preset.layout === "small" ? (
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              {preset.key === "record-breaker" ? (
                <View style={{ paddingTop: 6 }}>
                  {previewEntries.slice(0, 3).map((entry, index) => (
                    <Text
                      key={`${entry.userId ?? index}`}
                      style={{ color: index === 0 ? "#FFFFFF" : "rgba(255,255,255,0.68)", fontSize: index === 0 ? 20 : 14, lineHeight: index === 0 ? 23 : 17, fontWeight: "900", marginBottom: 3 }}
                      numberOfLines={1}
                    >
                      x{Number(entry.scoreValue ?? 0)}
                    </Text>
                  ))}
                </View>
              ) : (
                <OverlapAvatars entries={previewEntries} accentColor={preset.colors[0]} />
              )}
            </View>
          ) : null}
          {preset.layout === "tall" ? (
            <View style={{ flex: 1, justifyContent: "space-evenly" }}>
              {[0, 1].map((rowIndex) => {
                const leftEntry = previewEntries[rowIndex * 2];
                const rightEntry = previewEntries[rowIndex * 2 + 1];
                return (
                  <View key={`pair-${rowIndex}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <AvatarBubble entry={leftEntry} size={54} fallbackColor={preset.colors[0]} />
                    <Text style={{ color: "#FFE0C2", fontSize: 16, fontWeight: "800" }}>Sent to</Text>
                    <AvatarBubble entry={rightEntry} size={44} fallbackColor={preset.colors[1]} />
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "700", flex: 1 }} numberOfLines={1}>{board?.title ?? preset.subtitle}</Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: board ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "900" }}>{board ? "LIVE" : "PREVIEW"}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function LeaderboardsScreen() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((state) => state.authMode);
  const runtimeScope = getMobileRuntimeScope();
  const bootstrapQuery = trpc.config.getBootstrap.useQuery(runtimeScope, { retry: false });
  const enabledFlags = useMemo(() => new Map(((bootstrapQuery.data?.featureFlags ?? []) as any[]).map((flag) => [getFlagKey(flag), Boolean(flag?.enabled)])), [bootstrapQuery.data?.featureFlags]);
  const leaderboardsEnabled = enabledFlags.get("leaderboards") !== false;
  const liveBoardsQuery = trpc.leaderboards.list.useQuery({ status: "ACTIVE" }, { enabled: leaderboardsEnabled, retry: 1 });

  const boardList = useMemo(() => ((liveBoardsQuery.data ?? []) as Leaderboard[]).filter((board) => !board.status || String(board.status).toUpperCase() === "ACTIVE"), [liveBoardsQuery.data]);
  const configBoards = useMemo(() => ((bootstrapQuery.data?.leaderboardConfigs ?? []) as LeaderboardConfig[]).filter((config) => config.isActive !== false), [bootstrapQuery.data?.leaderboardConfigs]);

  const showcaseCards = useMemo<ShowcaseCard[]>(() => {
    const boardAssignments = mapBoardsToPresets(boardList);
    const configAssignments = mapConfigsToPresets(configBoards);
    return CARD_PRESETS.map((preset) => ({ preset, board: boardAssignments.get(preset.key) ?? null, config: configAssignments.get(preset.key) ?? null, enabled: leaderboardsEnabled }));
  }, [boardList, configBoards, leaderboardsEnabled]);

  const previewEntriesByCard = useMemo(() => Object.fromEntries(showcaseCards.map((card) => [card.preset.key, buildPreviewEntries(card.preset.key, card.board?.title ?? card.preset.title)])) as Record<string, LeaderboardEntry[]>, [showcaseCards]);

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: 34 }}>
        <LinearGradient colors={["#161C30", "#090E19"]} style={{ marginBottom: 18, borderRadius: 30, padding: 18, borderWidth: 1, borderColor: PANEL_BORDER }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => (typeof router.canGoBack === "function" && router.canGoBack() ? router.back() : router.replace("/(tabs)" as never))} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.05)" }}>
              <MaterialCommunityIcons color="#FFFFFF" name="chevron-left" size={28} />
            </TouchableOpacity>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "900" }}>Toplist</Text>
              <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, marginTop: 4 }}>Open each board to inspect live podiums, weekly gifts, combos, records, and game results.</Text>
            </View>
          </View>
          {authMode !== "authenticated" ? <Text style={{ color: "#FFE2B8", fontSize: 12, fontWeight: "700", marginTop: 14 }}>Guest mode stays enabled. Cards remain visible and live reads use public access where available.</Text> : null}
        </LinearGradient>

        {!leaderboardsEnabled ? <InfoBanner icon="toggle-switch-off-outline" title="Leaderboards are disabled" body="The admin feature flag for leaderboards is off for this runtime scope. Layout previews remain available, but live ranking reads are paused until the flag is re-enabled." background={PANEL_BG} /> : null}
        {liveBoardsQuery.error ? <InfoBanner icon="cloud-alert-outline" title="Live boards are unavailable" body="The app could not read published leaderboards from the backend. The route grid stays visible so design verification and navigation still work while the service recovers." actionLabel="Retry" onAction={() => liveBoardsQuery.refetch()} background={PANEL_BG} /> : null}
        {liveBoardsQuery.isLoading && boardList.length === 0 ? (
          <View style={{ marginBottom: 16, borderRadius: 22, backgroundColor: PANEL_BG, borderWidth: 1, borderColor: PANEL_BORDER, padding: 16, flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 13, fontWeight: "700", marginLeft: 12 }}>Syncing live leaderboard cards...</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <FeatureCard item={showcaseCards[0]!} previewEntries={previewEntriesByCard[showcaseCards[0]!.preset.key] ?? []} />
          <View style={{ width: "47.6%" }}>
            {showcaseCards.slice(1, 3).map((item) => <FeatureCard key={item.preset.key} item={item} previewEntries={previewEntriesByCard[item.preset.key] ?? []} />)}
          </View>
        </View>

        {showcaseCards[3] ? <FeatureCard item={showcaseCards[3]} previewEntries={previewEntriesByCard[showcaseCards[3].preset.key] ?? []} /> : null}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ width: "47.6%" }}>
            {showcaseCards[4] ? <FeatureCard item={showcaseCards[4]} previewEntries={previewEntriesByCard[showcaseCards[4].preset.key] ?? []} /> : null}
            {showcaseCards[6] ? <FeatureCard item={showcaseCards[6]} previewEntries={previewEntriesByCard[showcaseCards[6].preset.key] ?? []} /> : null}
          </View>
          {showcaseCards[5] ? <FeatureCard item={showcaseCards[5]} previewEntries={previewEntriesByCard[showcaseCards[5].preset.key] ?? []} /> : null}
        </View>

        <View style={{ marginTop: 10, borderRadius: 24, borderWidth: 1, borderColor: PANEL_BORDER, backgroundColor: PANEL_BG, padding: 16 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginBottom: 6 }}>Available boards</Text>
          {showcaseCards.map((card) => (
            <TouchableOpacity key={card.preset.key} onPress={() => router.push(`/leaderboards/${card.preset.key}` as never)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: card.preset.key === showcaseCards[showcaseCards.length - 1]?.preset.key ? 0 : 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, overflow: "hidden", marginRight: 12 }}>
                  <LinearGradient colors={card.preset.colors} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons color="#FFFFFF" name={card.preset.icon} size={20} />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}>{card.preset.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 12, marginTop: 3 }} numberOfLines={1}>{card.board?.title ?? card.config?.configKey ?? card.preset.subtitle}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: card.board ? "rgba(85,197,122,0.18)" : "rgba(255,255,255,0.08)" }}>
                  <Text style={{ color: card.board ? "#8BFFB0" : "rgba(255,255,255,0.74)", fontSize: 10, fontWeight: "900" }}>{card.board ? "LIVE" : "PREVIEW"}</Text>
                </View>
                <MaterialCommunityIcons color="rgba(255,255,255,0.62)" name="chevron-right" size={26} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
