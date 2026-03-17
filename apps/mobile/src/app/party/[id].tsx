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
  const authMode = useAuthStore((s) => s.authMode);
  const { emit, emitWithAck, on } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const isAuthenticated = authMode === "authenticated";

  // Fetch room state
  const room = trpc.party.getRoomState.useQuery({ roomId: id! }, { retry: false, enabled: !!id && isAuthenticated });
  const state = room.data as any;

  useEffect(() => {
    if (!id || !isAuthenticated) return;

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
  }, [emit, id, isAuthenticated, on, room]);

  const sendChat = async () => {
    if (!inputText.trim()) return;
    const response = await emitWithAck<{ ok: boolean }>(SOCKET_EVENTS.PARTY.CHAT, { roomId: id, message: inputText.trim() }).catch(() => ({ ok: false }));
    if (!response?.ok) return;
    setInputText("");
  };

  const sendReaction = (reaction: string) => {
    emit(SOCKET_EVENTS.PARTY.REACTION, { roomId: id, reaction });
  };

  if (!isAuthenticated) {
    return (
      <Screen>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>Sign in to enter party rooms</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>
            Browsing the party showcase is available from the home screen, but joining a room and claiming seats requires an authenticated account.
          </Text>
          <Button title="Sign In" onPress={() => router.push("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Room Header */}
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{state?.room?.roomName ?? "Party Room"}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{state?.members?.length ?? 0} members</Text>
      </View>

      {/* Seat Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SPACING.md, paddingVertical: SPACING.md }}>
        {Array.from({ length: Number(state?.room?.maxSeats ?? state?.seats?.length ?? 8) }, (_, i) => {
          const seat = state?.seats?.[i];
          const occupied = !!seat?.occupantUserId;
          const seatedMember = occupied ? state?.members?.find((member: any) => member.userId === seat?.occupantUserId) : null;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (!occupied) emit(SOCKET_EVENTS.PARTY.SEAT_UPDATE, { roomId: id, seatNumber: i + 1, action: "claim" });
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
                  <Avatar uri={seatedMember?.avatarUrl} size={40} />
                  <Text style={{ fontSize: 10, color: COLORS.text, marginTop: 4, fontWeight: "500" }}>
                    {seatedMember?.displayName ?? `Seat ${i + 1}`}
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
