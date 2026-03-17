import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { Badge, Button } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { useCallStore } from "@/store";

type GameInfo = {
  id: string;
  name: string;
  icon: string;
  description: string;
  players: string;
  available: boolean;
};

const GAMES: GameInfo[] = [
  { id: "ludo", name: "Ludo", icon: "🎲", description: "Classic board game — race your pieces to the finish!", players: "2 players", available: true },
  { id: "chess", name: "Chess", icon: "♟️", description: "Strategic battle of wits on a 64-square board.", players: "2 players", available: true },
  { id: "carrom", name: "Carrom", icon: "🎯", description: "Flick and pocket — tabletop precision game.", players: "2 players", available: true },
  { id: "sudoku", name: "Sudoku", icon: "🔢", description: "Fill the grid — logic puzzle challenge.", players: "1-2 players", available: true },
];

export default function GamesScreen() {
  const isInCall = useCallStore((s) => s.isInCall);

  const handleStartGame = (game: GameInfo) => {
    if (!isInCall) {
      Alert.alert("Call Required", "Games can only be played during an active voice or video call with a verified model.");
      return;
    }
    Alert.alert("Start Game", `Start a ${game.name} session?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Start", onPress: () => { /* Game start handled by socket event */ } },
    ]);
  };

  const renderGame = ({ item }: { item: GameInfo }) => (
    <TouchableOpacity onPress={() => handleStartGame(item)} activeOpacity={0.7}>
      <LinearGradient
        colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.md,
          marginBottom: SPACING.sm,
          borderRadius: 20,
          padding: SPACING.md,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View style={{
          width: 56, height: 56, borderRadius: RADIUS.lg,
          backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.white }}>{item.name}</Text>
            {item.available && <Badge label="Available" color={COLORS.success} />}
          </View>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>{item.description}</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginTop: 2 }}>{item.players}</Text>
        </View>
        <MaterialCommunityIcons color="rgba(255,255,255,0.66)" name="play" size={22} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(18,21,71,0.2)", "rgba(10,18,60,0.78)", "rgba(8,14,47,0.98)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={16} />

      <View style={{ flex: 1, padding: SPACING.md, paddingTop: SPACING.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
            <MaterialCommunityIcons color="#FFFFFF" name="arrow-left" size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: SPACING.md }}>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900" }}>Games</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Play live call games without leaving the session flow.</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>{GAMES.length}</Text>
          </View>
        </View>

        {!isInCall ? (
          <LinearGradient colors={["rgba(103,231,255,0.16)", "rgba(108,92,231,0.12)"]} style={{ padding: SPACING.md, borderRadius: 18, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(103,231,255,0.16)" }}>
            <Text style={{ fontSize: 14, color: "#A4F1FF", textAlign: "center", lineHeight: 20 }}>
              Games are available during active voice or video calls with verified models.
            </Text>
            <Button title="Open Call Flow" onPress={() => router.push("/(tabs)/discover")} style={{ marginTop: SPACING.md }} />
          </LinearGradient>
        ) : null}

        <FlatList
          data={GAMES}
          keyExtractor={(item) => item.id}
          renderItem={renderGame}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}
