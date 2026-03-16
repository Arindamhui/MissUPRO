import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Dimensions, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSocket } from "@/hooks/useSocket";
import { Avatar, Badge, CoinDisplay } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useUIStore } from "@/store";
import { SOCKET_EVENTS } from "@missu/types";

const { width, height } = Dimensions.get("window");

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  username: string;
  timestamp: number;
}

type StreamSyncEvent = {
  event: string;
  payload: Record<string, any>;
};

export default function StreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { emit, emitWithAck, on } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    emit(SOCKET_EVENTS.STREAM.JOIN, { roomId: id });
    emit(SOCKET_EVENTS.STREAM.SYNC_REQUEST, { roomId: id, limit: 30 });

    const pushMessage = (msg: any) => {
      setMessages((prev) => [...prev.slice(-100), { ...msg, id: String(msg.id ?? Date.now()) }]);
    };

    const unsub1 = on(SOCKET_EVENTS.STREAM.CHAT_MESSAGE, (msg: ChatMessage) => {
      pushMessage(msg);
    });

    const unsub2 = on(SOCKET_EVENTS.STREAM.VIEWER_JOINED, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => c + 1);
    });

    const unsub3 = on(SOCKET_EVENTS.STREAM.VIEWER_LEFT, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => Math.max(0, c - 1));
    });

    const unsub4 = on(SOCKET_EVENTS.STREAM.SYNC_STATE, (payload: { viewerCount: number; recentEvents: StreamSyncEvent[]; recentMessages?: ChatMessage[] }) => {
      setViewerCount(payload.viewerCount ?? 0);
      const replayedMessages = (payload.recentMessages?.length
        ? payload.recentMessages
        : (payload.recentEvents ?? [])
          .filter((event) => event.event === SOCKET_EVENTS.STREAM.CHAT_MESSAGE)
          .map((event, index) => ({ ...(event.payload as ChatMessage), id: String((event.payload as any).id ?? `replay-${index}`) }))) as ChatMessage[];
      setMessages(replayedMessages.slice(-100));
    });

    return () => {
      emit(SOCKET_EVENTS.STREAM.LEAVE, { roomId: id });
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
    };
  }, [id]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const response = await emitWithAck<{ ok: boolean }>(SOCKET_EVENTS.STREAM.CHAT, { roomId: id, message: inputText.trim() }).catch(() => ({ ok: false }));
    if (!response?.ok) return;
    setInputText("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Video Area */}
      <View style={{ flex: 1, backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: COLORS.white, opacity: 0.5, fontSize: 16 }}>Agora RTC Stream</Text>

        {/* Top Bar */}
        <View style={{ position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{
            backgroundColor: "rgba(0,0,0,0.5)", width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: COLORS.white, fontSize: 20 }}>←</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
              <Text style={{ color: COLORS.white, fontSize: 12 }}>👁 {viewerCount}</Text>
            </View>
            <View style={{ backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
              <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>LIVE</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chat Overlay */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.4 }}>
        {/* Messages */}
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600", marginRight: 6 }}>
                {item.username}
              </Text>
              <Text style={{ color: COLORS.white, fontSize: 13, flex: 1 }}>{item.message}</Text>
            </View>
          )}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{
            flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: "rgba(0,0,0,0.7)", gap: 8,
          }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: RADIUS.full,
                paddingHorizontal: 16, paddingVertical: 8, color: COLORS.white, fontSize: 14,
              }}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={() => useUIStore.getState().openGiftDrawer({ userId: "host", context: "live", roomId: id })}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>🎁</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
