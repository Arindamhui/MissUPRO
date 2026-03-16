import React from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { Screen, Card, Badge } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
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
      <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, marginBottom: SPACING.sm }}>
        <View style={{
          width: 56, height: 56, borderRadius: RADIUS.lg,
          backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text }}>{item.name}</Text>
            {item.available && <Badge label="Available" color={COLORS.success} />}
          </View>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{item.description}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{item.players}</Text>
        </View>
        <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>▶</Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Screen>
      {!isInCall && (
        <View style={{
          backgroundColor: COLORS.primaryLight, padding: SPACING.md,
          marginHorizontal: SPACING.md, marginTop: SPACING.sm, borderRadius: RADIUS.lg,
        }}>
          <Text style={{ fontSize: 14, color: COLORS.primaryDark, textAlign: "center" }}>
            🎮 Games are available during voice/video calls with verified models
          </Text>
        </View>
      )}
      <FlatList
        data={GAMES}
        keyExtractor={(item) => item.id}
        renderItem={renderGame}
        contentContainerStyle={{ padding: SPACING.md }}
      />
    </Screen>
  );
}
