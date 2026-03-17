import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, FlatList, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Avatar, Button, Card } from "@/components/ui";
import { useSocket } from "@/hooks/useSocket";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";

export default function ChatScreen() {
  const { id, recipientId } = useLocalSearchParams<{ id: string; recipientId?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const { emit, emitWithAck, on } = useSocket();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const conversationLookup = trpc.social.getOrCreateConversation.useQuery(
    { otherUserId: recipientId! },
    { retry: false, enabled: !!recipientId && isAuthenticated },
  );

  const conversationId = recipientId ? conversationLookup.data?.conversation.id : id;

  const history = trpc.social.getMessages.useQuery(
    { conversationId: conversationId!, limit: 50 },
    { retry: false, enabled: !!conversationId && isAuthenticated },
  );

  const resolvedRecipientId = recipientId ?? history.data?.conversation?.otherUserId ?? null;
  const recipientSummary = trpc.user.getUserSummary.useQuery(
    { userId: String(resolvedRecipientId ?? "") },
    { retry: false, enabled: !!resolvedRecipientId && isAuthenticated },
  );

  useEffect(() => {
    if (history.data?.messages) {
      setMessages([...(history.data.messages as any[])].reverse());
    }
  }, [history.data]);

  useEffect(() => {
    if (!isAuthenticated) return () => undefined;

    const unsub = on(SOCKET_EVENTS.DM.MESSAGE, (msg: any) => {
      if (msg?.conversationId && conversationId && msg.conversationId !== conversationId) {
        return;
      }
      if (msg?.deliveryId) {
        emit(SOCKET_EVENTS.DELIVERY.ACK, { deliveryId: msg.deliveryId });
      }
      setMessages((prev) => [...prev, msg]);
      flatListRef.current?.scrollToEnd();
    });
    return () => {
      unsub?.();
    };
  }, [conversationId, emit, isAuthenticated, on]);

  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;
    emitWithAck(SOCKET_EVENTS.DM.READ_UPDATE, { conversationId }).catch(() => undefined);
  }, [conversationId, emitWithAck, isAuthenticated]);

  const sendMessage = async () => {
    if (!inputText.trim() || !resolvedRecipientId) return;

    const response = await emitWithAck<{ ok: boolean; message?: any }>(SOCKET_EVENTS.DM.SEND, {
      recipientId: resolvedRecipientId,
      conversationId,
      content: inputText.trim(),
      messageType: "TEXT",
    }).catch(() => ({ ok: false }));

    if (!response?.ok || !("message" in response) || !response.message) {
      return;
    }

    setMessages((prev) => [...prev, response.message]);
    setInputText("");
    flatListRef.current?.scrollToEnd();
  };

  const handleTyping = () => {
    if (!resolvedRecipientId || !conversationId) return;
    emit(SOCKET_EVENTS.DM.TYPING_START, { recipientId: resolvedRecipientId, conversationId });
  };

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0C1345", padding: SPACING.md, justifyContent: "center" }}>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: "800" }}>Sign in to open messages</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
            Conversations are protected and tied to authenticated accounts. Guest mode can browse the app, but direct messaging requires sign-in.
          </Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0C1345" }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar uri={(recipientSummary.data as any)?.avatarUrl} size={44} online={(recipientSummary.data as any)?.presenceStatus === "ONLINE"} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>{(recipientSummary.data as any)?.displayName ?? "Conversation"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{(recipientSummary.data as any)?.presenceStatus === "ONLINE" ? "Online now" : "Direct message thread"}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === userId;
          return (
            <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
              {!isMe && <Avatar size={32} />}
              <View
                style={{
                  maxWidth: "70%",
                  backgroundColor: isMe ? "#5F63FF" : "rgba(255,255,255,0.1)",
                  borderRadius: RADIUS.lg,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  marginLeft: isMe ? 0 : 8,
                  marginRight: isMe ? 8 : 0,
                  borderBottomRightRadius: isMe ? 4 : RADIUS.lg,
                  borderBottomLeftRadius: isMe ? RADIUS.lg : 4,
                  borderWidth: isMe ? 0 : 1,
                  borderColor: isMe ? undefined : "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: 15 }}>{item.content}</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 4, textAlign: "right" }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={{ flexDirection: "row", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", gap: 8, alignItems: "center", backgroundColor: "rgba(0,0,0,0.25)" }}>
        <TextInput
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            handleTyping();
          }}
          placeholder="Type a message..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: RADIUS.full,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: COLORS.white,
          }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: inputText.trim() ? "#5F63FF" : "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: COLORS.white }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
