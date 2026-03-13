import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Avatar } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";
import { useAuthStore } from "@/store";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const { emit, on } = useSocket();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const history = trpc.social.getMessages.useQuery(
    { conversationId: id!, limit: 50 },
    { retry: false, enabled: !!id },
  );

  useEffect(() => {
    if (history.data?.messages) {
      setMessages(history.data.messages as any[]);
    }
  }, [history.data]);

  useEffect(() => {
    const unsub = on(SOCKET_EVENTS.DM.MESSAGE, (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      flatListRef.current?.scrollToEnd();
    });
    return () => { unsub?.(); };
  }, [on]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const msg = {
      id: Date.now().toString(),
      senderId: userId,
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
    };
    emit(SOCKET_EVENTS.DM.SEND, { recipientId: id, message: msg });
    setMessages((prev) => [...prev, msg]);
    setInputText("");
    flatListRef.current?.scrollToEnd();
  };

  const handleTyping = () => {
    emit(SOCKET_EVENTS.DM.TYPING_START, { recipientId: id, conversationId: id });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === userId;
          return (
            <View style={{
              flexDirection: "row",
              justifyContent: isMe ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}>
              {!isMe && <Avatar size={32} />}
              <View style={{
                maxWidth: "70%",
                backgroundColor: isMe ? COLORS.primary : COLORS.surface,
                borderRadius: RADIUS.lg,
                paddingHorizontal: 14, paddingVertical: 10,
                marginLeft: isMe ? 0 : 8, marginRight: isMe ? 8 : 0,
                borderBottomRightRadius: isMe ? 4 : RADIUS.lg,
                borderBottomLeftRadius: isMe ? RADIUS.lg : 4,
              }}>
                <Text style={{ color: isMe ? COLORS.white : COLORS.text, fontSize: 15 }}>{item.content}</Text>
                <Text style={{ color: isMe ? "rgba(255,255,255,0.6)" : COLORS.textSecondary, fontSize: 10, marginTop: 4, textAlign: "right" }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={{
        flexDirection: "row", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8, alignItems: "center",
      }}>
        <TextInput
          value={inputText}
          onChangeText={(text) => { setInputText(text); handleTyping(); }}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textSecondary}
          style={{
            flex: 1, backgroundColor: COLORS.inputBg, borderRadius: RADIUS.full,
            paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text,
          }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: inputText.trim() ? COLORS.primary : COLORS.surface,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
