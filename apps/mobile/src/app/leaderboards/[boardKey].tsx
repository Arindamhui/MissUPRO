import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarBubble, CrownBadge, InfoBanner, RankedListRow, SegmentedTabs } from "@/components/leaderboards/showcase";
import {
  buildPreviewEntries,
  CARD_PRESETS,
  formatScore,
  getFlagKey,
  mapBoardsToPresets,
  mapConfigsToPresets,
  resolvePreset,
  type Leaderboard,
  type LeaderboardConfig,
  type LeaderboardEntry,
} from "@/lib/leaderboards-showcase";
import { getMobileRuntimeScope } from "@/lib/runtime-config";
import { trpc } from "@/lib/trpc";

type SnapshotLike = {
  snapshotDate?: string;
  totalParticipants?: number;
  entriesJson?: Array<{ userId?: string; scoreValue?: string; displayName?: string }>;
};

const DETAIL_BACKGROUNDS: Record<string, [string, string, string]> = {
  "top-users": ["#5B1FFF", "#4320C0", "#28104F"],
  "top-talents": ["#8D3D0D", "#53220B", "#2A130A"],
  "new-star": ["#304CC8", "#24398C", "#132046"],
  "weekly-star": ["#A61559", "#6C0F40", "#2A0821"],
  "record-breaker": ["#2D3A63", "#1A2140", "#0C1122"],
  combo: ["#8F420F", "#602307", "#2A1006"],
  game: ["#3049D7", "#1A2E84", "#101D46"],
};

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
      <TouchableOpacity onPress={() => (typeof router.canGoBack === "function" && router.canGoBack() ? router.back() : router.replace("/leaderboards" as never))} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons color="#FFFFFF" name="chevron-left" size={30} />
      </TouchableOpacity>
      <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginLeft: 8 }}>{title}</Text>
    </View>
  );
}

function PodiumSection({ entries, bronzeTint = "#C99674", silverTint = "#B7BFF2", goldTint = "#F2C94C" }: { entries: LeaderboardEntry[]; bronzeTint?: string; silverTint?: string; goldTint?: string }) {
  const lineup = [entries[1], entries[0], entries[2]];
  const ranks = [2, 1, 3];

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22, marginBottom: 18 }}>
      {lineup.map((entry, index) => {
        const rank = ranks[index]!;
        const tint = rank === 1 ? goldTint : rank === 2 ? silverTint : bronzeTint;
        return (
          <View key={`podium-${rank}`} style={{ width: rank === 1 ? "39%" : "28%", alignItems: "center" }}>
            <View style={{ marginBottom: 6 }}>
              <CrownBadge tone={rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze"} size={rank === 1 ? 28 : 22} />
            </View>
            <View style={{ borderWidth: 4, borderColor: tint, borderRadius: 999, padding: 3, backgroundColor: "rgba(255,255,255,0.08)" }}>
              <AvatarBubble entry={entry} size={rank === 1 ? 104 : 82} fallbackColor={tint} borderColor="transparent" />
            </View>
            <View style={{ width: "100%", marginTop: 10, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: `${tint}66`, paddingVertical: rank === 1 ? 18 : 14, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }} numberOfLines={1}>{entry?.displayName ?? `TOP ${rank}`}</Text>
              <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "900", marginTop: 6 }}>{rank === 1 ? "TOP 1" : `TOP ${rank}`}</Text>
              <View style={{ marginTop: 10, width: 56, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FF5F52", fontSize: 22, fontWeight: "900" }}>+</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WeeklyGiftRow({ title, entries, onPress }: { title: string; entries: LeaderboardEntry[]; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={{ marginBottom: 14, borderRadius: 18, borderWidth: 1.5, borderColor: "#F5D26A", backgroundColor: "rgba(102,0,86,0.48)", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
        <MaterialCommunityIcons color="#FFD34E" name="gift" size={28} />
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700", flex: 1 }}>{title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
        {entries.slice(0, 3).map((entry, index) => (
          <View key={`${entry.userId ?? index}`} style={{ marginLeft: index === 0 ? 0 : -12 }}>
            <AvatarBubble entry={entry} size={44} fallbackColor="#D46DFF" />
          </View>
        ))}
      </View>
      <MaterialCommunityIcons color="#FFFFFF" name="chevron-right" size={30} />
    </TouchableOpacity>
  );
}

function RibbonTitle({ title }: { title: string }) {
  return (
    <LinearGradient colors={["#85331B", "#B35A1E", "#7A210F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", borderWidth: 1.5, borderColor: "#E9B95C", marginBottom: 18 }}>
      <Text style={{ color: "#FFEAB3", fontSize: 18, fontWeight: "900", letterSpacing: 0.4 }}>{title}</Text>
    </LinearGradient>
  );
}

function DetailPodiumBlock({ title, entries, metricLabel }: { title: string; entries: LeaderboardEntry[]; metricLabel: string }) {
  return (
    <View style={{ marginBottom: 28 }}>
      <RibbonTitle title={title} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        {[entries[1], entries[0], entries[2]].map((entry, index) => {
          const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
          const tint = rank === 1 ? "#F7D65E" : rank === 2 ? "#CDD1FF" : "#F1B28E";
          return (
            <View key={`${title}-${rank}`} style={{ width: rank === 1 ? "34%" : "30%", alignItems: "center" }}>
              <CrownBadge tone={rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze"} size={22} />
              <View style={{ marginTop: 8, borderWidth: 4, borderColor: tint, borderRadius: 999, padding: 3 }}>
                <AvatarBubble entry={entry} size={rank === 1 ? 92 : 78} fallbackColor={tint} borderColor="transparent" />
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900", marginTop: 10 }} numberOfLines={1}>{entry?.displayName ?? `Top ${rank}`}</Text>
              <Text style={{ color: "#FFE9BA", fontSize: 13, fontWeight: "800", marginTop: 6 }}>{metricLabel} {Number(entry?.scoreValue ?? rank * 50)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RecordCard({ title, count, date, leftLabel, rightLabel }: { title: string; count: string; date: string; leftLabel: string; rightLabel: string }) {
  return (
    <View style={{ marginBottom: 18, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.10)", padding: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "700" }}>{date}</Text>
      </View>
      <LinearGradient colors={["#3E2CFF", "#FF2FA5"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ borderRadius: 14, padding: 16, minHeight: 106, justifyContent: "center" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "900", textAlign: "center" }}>x{count}</Text>
        <Text style={{ color: "#FFE99E", fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 6 }}>{leftLabel} vs {rightLabel}</Text>
      </LinearGradient>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 16 }}>Record breaking!!!</Text>
        <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#E269FF" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ComboCard({ left, right, title, score, date }: { left: LeaderboardEntry; right: LeaderboardEntry; title: string; score: string; date: string }) {
  return (
    <LinearGradient colors={["rgba(147,46,5,0.92)", "rgba(82,22,4,0.88)"]} style={{ borderRadius: 24, borderWidth: 1.5, borderColor: "#F1D086", marginBottom: 18, padding: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700", flex: 1 }}>{title} combo x {score}</Text>
        <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "700" }}>{date}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: "34%", alignItems: "center" }}>
          <AvatarBubble entry={left} size={82} fallbackColor="#C8702D" />
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: 10 }} numberOfLines={1}>{left.displayName ?? "Sender"}</Text>
        </View>
        <View style={{ width: "24%", alignItems: "center" }}>
          <LinearGradient colors={["#FF9E8A", "#FF6270"]} style={{ width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>Sent to</Text>
          </LinearGradient>
        </View>
        <View style={{ width: "34%", alignItems: "center" }}>
          <AvatarBubble entry={right} size={74} fallbackColor="#F0888E" />
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", marginTop: 10 }} numberOfLines={1}>{right.displayName ?? "Receiver"}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function GameBanner({ title, amount, date, winner }: { title: string; amount: string; date: string; winner: string }) {
  return (
    <LinearGradient colors={["rgba(255,109,180,0.20)", "rgba(96,53,255,0.26)"]} style={{ borderRadius: 16, marginBottom: 18, padding: 12 }}>
      <View style={{ alignItems: "flex-end", marginBottom: 8 }}>
        <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "700" }}>{date}</Text>
      </View>
      <LinearGradient colors={["#F8B84F", "#FF3BC2", "#7E31FF"]} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={{ borderRadius: 14, minHeight: 120, padding: 16, justifyContent: "center" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900", marginBottom: 6 }}>{winner}</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>Won by <Text style={{ color: "#FFE15C" }}>{amount}</Text> beans!</Text>
        <Text style={{ color: "rgba(255,255,255,0.86)", fontSize: 12, fontWeight: "700", marginTop: 8 }}>{title}</Text>
      </LinearGradient>
    </LinearGradient>
  );
}

export default function LeaderboardDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ boardKey?: string; item?: string }>();
  const boardKey = String(params.boardKey ?? CARD_PRESETS[0].key);
  const selectedItem = params.item ? String(params.item) : null;
  const preset = resolvePreset(boardKey);
  const [selectedTab, setSelectedTab] = useState(preset.tabs[0] ?? "");
  const runtimeScope = getMobileRuntimeScope();

  useEffect(() => {
    setSelectedTab(preset.tabs[0] ?? "");
  }, [preset.key, preset.tabs]);

  const bootstrapQuery = trpc.config.getBootstrap.useQuery(runtimeScope, { retry: false });
  const enabledFlags = useMemo(() => new Map(((bootstrapQuery.data?.featureFlags ?? []) as any[]).map((flag) => [getFlagKey(flag), Boolean(flag?.enabled)])), [bootstrapQuery.data?.featureFlags]);
  const leaderboardsEnabled = enabledFlags.get("leaderboards") !== false;
  const liveBoardsQuery = trpc.leaderboards.list.useQuery({ status: "ACTIVE" }, { enabled: leaderboardsEnabled, retry: 1 });

  const boardList = useMemo(() => ((liveBoardsQuery.data ?? []) as Leaderboard[]).filter((board) => !board.status || String(board.status).toUpperCase() === "ACTIVE"), [liveBoardsQuery.data]);
  const configBoards = useMemo(() => ((bootstrapQuery.data?.leaderboardConfigs ?? []) as LeaderboardConfig[]).filter((config) => config.isActive !== false), [bootstrapQuery.data?.leaderboardConfigs]);

  const boardAssignments = useMemo(() => mapBoardsToPresets(boardList), [boardList]);
  const configAssignments = useMemo(() => mapConfigsToPresets(configBoards), [configBoards]);
  const selectedBoard = boardAssignments.get(preset.key) ?? null;
  const selectedConfig = configAssignments.get(preset.key) ?? null;

  const entriesQuery = trpc.leaderboards.getEntries.useQuery(
    { leaderboardId: selectedBoard?.id ?? "00000000-0000-0000-0000-000000000000", limit: 24 },
    { enabled: !!selectedBoard?.id && leaderboardsEnabled, retry: 1 },
  );
  const snapshotsQuery = trpc.leaderboards.getSnapshots.useQuery(
    { leaderboardId: selectedBoard?.id ?? "00000000-0000-0000-0000-000000000000", limit: 12 },
    { enabled: !!selectedBoard?.id && leaderboardsEnabled, retry: 1 },
  );

  const liveEntries = ((entriesQuery.data?.items ?? []) as LeaderboardEntry[]).slice(0, 24);
  const previewEntries = useMemo(() => buildPreviewEntries(preset.key, selectedBoard?.title ?? preset.title, liveEntries), [preset.key, preset.title, selectedBoard?.title, liveEntries]);
  const displayEntries = liveEntries.length > 0 ? liveEntries : previewEntries;
  const snapshots = ((snapshotsQuery.data?.snapshots ?? []) as SnapshotLike[]).slice(0, 12);
  const background = DETAIL_BACKGROUNDS[preset.key] ?? ["#162038", "#10182B", "#0A1019"];

  const renderPodiumScreen = () => (
    <>
      <SegmentedTabs tabs={preset.tabs} value={selectedTab} onChange={setSelectedTab} activeFill={preset.key === "top-talents" ? "#D26D1C" : preset.key === "new-star" ? "#486BFF" : "#6D47FF"} />
      <PodiumSection entries={displayEntries} goldTint="#F0D35B" silverTint="#BAC0FF" bronzeTint="#F2B18E" />
      <View style={{ marginTop: 8 }}>
        {displayEntries.slice(3, 10).map((entry, index) => (
          <RankedListRow key={entry.userId ?? `row-${index}`} rank={index + 4} entry={entry} accent={preset.key === "top-talents" ? "#FF5D52" : preset.key === "new-star" ? "#35A8FF" : "#5D8FFF"} onPress={() => entry.userId && router.push(`/profile/${entry.userId}` as never)} />
        ))}
      </View>
    </>
  );

  const renderWeeklyScreen = () => {
    if (selectedItem) {
      const topSet = displayEntries.slice(0, 3);
      const secondSet = displayEntries.slice(3, 6).length > 0 ? displayEntries.slice(3, 6) : displayEntries.slice(0, 3);
      return (
        <>
          <RibbonTitle title={`${selectedItem}`} />
          <DetailPodiumBlock title="Talent TOP3" entries={topSet} metricLabel="Received" />
          <DetailPodiumBlock title="User TOP3" entries={secondSet} metricLabel="Sent" />
        </>
      );
    }

    const titles = buildPreviewEntries("weekly-star", preset.title).map((entry) => entry.displayName ?? "Gift");
    return (
      <>
        <SegmentedTabs tabs={preset.tabs} value={selectedTab} onChange={setSelectedTab} activeFill="#D11375" />
        <View style={{ marginTop: 22, borderRadius: 28, borderWidth: 2, borderColor: "#F5BE4B", padding: 16, backgroundColor: "rgba(89,0,79,0.42)" }}>
          {titles.slice(0, 6).map((title, index) => (
            <WeeklyGiftRow key={`${title}-${index}`} title={title} entries={displayEntries.slice(index % 3, (index % 3) + 3)} onPress={() => router.push({ pathname: `/leaderboards/${preset.key}` as never, params: { item: title } } as never)} />
          ))}
        </View>
      </>
    );
  };

  const renderRecordScreen = () => {
    const cards = snapshots.length > 0 ? snapshots : [{ snapshotDate: "2023/02/06", totalParticipants: 2500 }, { snapshotDate: "2022/12/08", totalParticipants: 120 }, { snapshotDate: "2022/07/08", totalParticipants: 10104 }, { snapshotDate: "2022/06/21", totalParticipants: 5060 }];
    return (
      <View style={{ marginTop: 18 }}>
        {cards.map((snapshot, index) => (
          <RecordCard key={`record-${index}`} title={`${selectedBoard?.title ?? preset.title} Combo x${snapshot.totalParticipants ?? Number(displayEntries[index]?.scoreValue ?? 0)}`} count={String(snapshot.totalParticipants ?? Number(displayEntries[index]?.scoreValue ?? 0))} date={String(snapshot.snapshotDate ?? "2026/03/17")} leftLabel={displayEntries[index]?.displayName ?? "Mummy's Boy"} rightLabel={displayEntries[index + 1]?.displayName ?? "Bunny Agency"} />
        ))}
      </View>
    );
  };

  const renderComboScreen = () => {
    const pairs = displayEntries.length >= 2 ? displayEntries : buildPreviewEntries("combo", preset.title);
    return (
      <>
        <SegmentedTabs tabs={preset.tabs} value={selectedTab} onChange={setSelectedTab} activeFill="#A41C19" />
        <View style={{ marginTop: 20 }}>
          {[0, 2, 4].map((index) => (
            <ComboCard key={`combo-${index}`} left={pairs[index] ?? pairs[0]!} right={pairs[index + 1] ?? pairs[1] ?? pairs[0]!} title={selectedBoard?.title ?? ["Aeroplane", "Ultimate Romance", "Rocket"][index / 2] ?? preset.title} score={String(Math.max(2, Number(pairs[index]?.scoreValue ?? (index + 1) * 20)))} date={index === 0 ? "2026-03-10 09:13" : index === 2 ? "2026-03-14 11:58" : "2026-03-14 23:55"} />
          ))}
        </View>
      </>
    );
  };

  const renderGameScreen = () => {
    const labels = ["2022-08-22 20:57", "2022-03-31 00:34", "2021-10-10 22:59", "2021-10-08 00:50", "2021-09-15 04:36"];
    return (
      <>
        <SegmentedTabs tabs={preset.tabs} value={selectedTab} onChange={setSelectedTab} activeFill="#5364FF" />
        <View style={{ marginTop: 20 }}>
          {displayEntries.slice(0, 5).map((entry, index) => (
            <GameBanner key={`game-${index}`} title={selectedTab} amount={formatScore(entry.scoreValue ?? (57600000 - index * 7450000))} date={labels[index] ?? "2026-03-17 10:50"} winner={entry.displayName ?? "Winner"} />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A1019" }}>
      <StatusBar style="light" />
      <LinearGradient colors={background} style={{ position: "absolute", inset: 0 }}>
        <View style={{ position: "absolute", left: -40, top: 40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <View style={{ position: "absolute", right: -80, top: -10, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.05)" }} />
      </LinearGradient>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 26) }}>
        <Header title={selectedItem ? String(selectedItem) : preset.title} />

        {!leaderboardsEnabled ? <InfoBanner icon="toggle-switch-off-outline" title="Leaderboards are disabled" body="The admin feature flag for leaderboards is off for this runtime scope, so this screen is rendering its preview layout only." background="rgba(10,16,25,0.48)" /> : null}
        {liveBoardsQuery.error ? <InfoBanner icon="cloud-alert-outline" title="Live boards are unavailable" body="Leaderboard metadata could not be loaded from the backend. The screen stays open with preview content so layout verification still works." actionLabel="Retry" onAction={() => liveBoardsQuery.refetch()} background="rgba(10,16,25,0.48)" /> : null}
        {entriesQuery.isLoading && !selectedItem ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "700", marginTop: 10 }}>Loading live rankings...</Text>
          </View>
        ) : null}

        {!entriesQuery.isLoading && selectedBoard == null ? <InfoBanner icon="palette-outline" title="Preview board only" body={`No published leaderboard is attached to ${preset.title} yet. The UI is live and wired, but this category still needs an active board from admin config.`} background="rgba(10,16,25,0.48)" /> : null}
        {entriesQuery.error && selectedBoard ? <InfoBanner icon="database-alert-outline" title="Unable to load rankings" body="The leaderboard exists, but the backend could not return entries for this board. Retry after the service recovers or refresh the board snapshot." actionLabel="Retry" onAction={() => entriesQuery.refetch()} background="rgba(10,16,25,0.48)" /> : null}

        {preset.detailVariant === "podium" ? renderPodiumScreen() : null}
        {preset.detailVariant === "weekly" ? renderWeeklyScreen() : null}
        {preset.detailVariant === "record" ? renderRecordScreen() : null}
        {preset.detailVariant === "combo" ? renderComboScreen() : null}
        {preset.detailVariant === "game" ? renderGameScreen() : null}
      </ScrollView>
    </View>
  );
}