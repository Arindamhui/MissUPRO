import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Screen, Avatar, Badge, Button, Card } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";
import { useAuthStore } from "@/store";

export default function PartyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const { emit, emitWithAck, on } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  // Fetch room state
  const room = trpc.party.roomState.useQuery({ roomId: id! }, { retry: false, enabled: !!id });
  const state = room.data as any;

  useEffect(() => {
    emit(SOCKET_EVENTS.PARTY.JOIN, { roomId: id });
    emit(SOCKET_EVENTS.PARTY.SYNC_REQUEST, { roomId: id, limit: 30 });

    const unsub1 = on(SOCKET_EVENTS.PARTY.CHAT, (msg: any) => {
      setMessages((prev) => [...prev.slice(-200), msg]);
    });
    const unsub2 = on(SOCKET_EVENTS.PARTY.MEMBER_JOINED, () => { room.refetch(); });
    const unsub3 = on(SOCKET_EVENTS.PARTY.MEMBER_LEFT, () => { room.refetch(); });
    const unsub4 = on(SOCKET_EVENTS.PARTY.SEAT_UPDATE, () => { room.refetch(); });
    const unsub5 = on(SOCKET_EVENTS.PARTY.SYNC_STATE, (payload: { roomState?: any; recentEvents?: any[] }) => {
      if (payload?.roomState) {
        room.refetch();
      }
      const replayed = (payload?.recentEvents ?? [])
        .filter((event) => event.event === SOCKET_EVENTS.PARTY.CHAT)
        .map((event) => event.payload);
      setMessages(replayed.slice(-200));
    });

    return () => {
      emit(SOCKET_EVENTS.PARTY.LEAVE, { roomId: id });
      unsub1?.(); unsub2?.(); unsub3?.(); unsub4?.(); unsub5?.();
    };
  }, [id]);

  const sendChat = async () => {
    if (!inputText.trim()) return;
    const response = await emitWithAck<{ ok: boolean }>(SOCKET_EVENTS.PARTY.CHAT, { roomId: id, message: inputText.trim() }).catch(() => ({ ok: false }));
    if (!response?.ok) return;
    setInputText("");
  };

  const sendReaction = (reaction: string) => {
    emit(SOCKET_EVENTS.PARTY.REACTION, { roomId: id, reaction });
  };

  return (
    <Screen>
      {/* Room Header */}
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{state?.name ?? "Party Room"}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{state?.memberCount ?? 0} members</Text>
      </View>

      {/* Seat Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SPACING.md, paddingVertical: SPACING.md }}>
        {Array.from({ length: state?.seatCount ?? 8 }, (_, i) => {
          const seat = state?.seats?.[i];
          const occupied = !!seat?.userId;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (!occupied) emit(SOCKET_EVENTS.PARTY.SEAT_UPDATE, { roomId: id, seatNumber: i, action: "claim" });
              }}
              style={{
                width: 72, height: 90, borderRadius: RADIUS.lg,
                backgroundColor: occupied ? COLORS.primaryLight : COLORS.surface,
                alignItems: "center", justifyContent: "center",
                borderWidth: 2, borderColor: occupied ? COLORS.primary : COLORS.border,
                borderStyle: occupied ? "solid" : "dashed",
              }}
            >
              {occupied ? (
                <>
                  <Avatar size={40} />
                  <Text style={{ fontSize: 10, color: COLORS.text, marginTop: 4, fontWeight: "500" }}>
                    {seat.displayName ?? `Seat ${i + 1}`}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Empty</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reactions */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: SPACING.sm, paddingVertical: SPACING.sm }}>
        {["❤️", "🔥", "😂", "👏", "🎉", "💎"].map((r) => (
          <TouchableOpacity key={r} onPress={() => sendReaction(r)} style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 22 }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat */}
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <FlatList
          data={messages}
          inverted
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: SPACING.sm }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600", marginRight: 6 }}>{item.userId ?? "User"}</Text>
              <Text style={{ color: COLORS.text, fontSize: 13 }}>{item.message}</Text>
            </View>
          )}
        />
        <View style={{ flexDirection: "row", padding: SPACING.sm, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Say something..."
            placeholderTextColor={COLORS.textSecondary}
            style={{
              flex: 1, backgroundColor: COLORS.inputBg, borderRadius: RADIUS.full,
              paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: COLORS.text,
            }}
            onSubmitEditing={sendChat}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendChat} style={{
            width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
