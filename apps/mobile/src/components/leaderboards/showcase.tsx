import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Button } from "@/components/ui";
import { getInitials, type LeaderboardEntry } from "@/lib/leaderboards-showcase";

export function AvatarBubble({
  entry,
  size,
  fallbackColor,
  borderColor = "rgba(255,255,255,0.76)",
}: {
  entry?: LeaderboardEntry | null;
  size: number;
  fallbackColor: string;
  borderColor?: string;
}) {
  const uri = entry?.avatarUrl;
  const initials = getInitials(entry?.displayName);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2.5,
        borderColor,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: fallbackColor,
      }}
    >
      {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} /> : <Text style={{ color: "#FFFFFF", fontSize: Math.max(12, size * 0.28), fontWeight: "900" }}>{initials}</Text>}
    </View>
  );
}

export function CrownBadge({ tone, size = 20 }: { tone: "gold" | "silver" | "bronze"; size?: number }) {
  const color = tone === "gold" ? "#FFCC4D" : tone === "silver" ? "#D7DBF2" : "#FFD2A6";
  return <Text style={{ fontSize: size, color }}>{"👑"}</Text>;
}

export function InfoBanner({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  background = "#101828",
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  background?: string;
}) {
  return (
    <View style={{ marginBottom: 16, borderRadius: 22, backgroundColor: background, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(124,92,255,0.16)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <MaterialCommunityIcons color="#FFFFFF" name={icon} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, lineHeight: 20, marginTop: 4 }}>{body}</Text>
        </View>
      </View>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: 14 }} /> : null}
    </View>
  );
}

export function SegmentedTabs({
  tabs,
  value,
  onChange,
  activeFill = "rgba(255,120,160,0.88)",
}: {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
  activeFill?: string;
}) {
  return (
    <View style={{ flexDirection: "row", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.26)", backgroundColor: "rgba(20,12,35,0.28)", padding: 3 }}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: active ? activeFill : "transparent",
              borderWidth: active ? 1 : 0,
              borderColor: active ? "rgba(255,222,167,0.75)" : "transparent",
              alignItems: "center",
            }}
          >
            <Text style={{ color: active ? "#FFE6AF" : "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: active ? "900" : "700" }}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function RankedListRow({
  rank,
  entry,
  actionLabel = "+",
  accent = "#65B6FF",
  onPress,
}: {
  rank: number;
  entry: LeaderboardEntry;
  actionLabel?: string;
  accent?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
      <Text style={{ color: "#FFFFFF", width: 26, fontSize: 18, fontWeight: "800" }}>{rank}</Text>
      <AvatarBubble entry={entry} size={56} fallbackColor={accent} borderColor="rgba(255,255,255,0.28)" />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }} numberOfLines={1}>{entry.displayName ?? "User"}</Text>
        <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 12, fontWeight: "700", marginTop: 3 }}>Lv{Math.max(1, rank + 6)}</Text>
      </View>
      <View style={{ minWidth: 52, height: 38, borderRadius: 19, backgroundColor: accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>{actionLabel}</Text>
      </View>
    </Pressable>
  );
}
