import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Avatar, Button, Card } from "@/components/ui";
import { useSocket } from "@/hooks/useSocket";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";

type ChatMessage = {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  createdAt?: string;
  isRead?: boolean;
};

function normalizeMessage(raw: any): ChatMessage | null {
  const id = String(raw?.id ?? "").trim();
  const senderId = String(raw?.senderId ?? raw?.senderUserId ?? "").trim();
  const content = String(raw?.content ?? raw?.contentText ?? "").trim();

  if (!id || !senderId || !content) {
    return null;
  }

  const createdAtValue = raw?.createdAt;
  const parsedDate = createdAtValue ? new Date(createdAtValue) : null;

  return {
    id,
    conversationId: raw?.conversationId ? String(raw.conversationId) : undefined,
    senderId,
    content,
    createdAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : undefined,
    isRead: Boolean(raw?.isRead),
  };
}

function formatMessageTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatScreen() {
  const { id, recipientId } = useLocalSearchParams<{ id: string; recipientId?: string }>();
  const userId = useAuthStore((state) => state.userId);
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const { emit, emitWithAck, on } = useSocket();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
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

  const headerSubtitle = useMemo(() => {
    if ((recipientSummary.data as any)?.presenceStatus === "ONLINE") {
      return "Online now";
    }
    if (messages.length > 0) {
      return `${messages.length} messages in this thread`;
    }
    return "Private message thread";
  }, [messages.length, recipientSummary.data]);

  useEffect(() => {
    if (history.data?.messages) {
      setMessages(
        [...(history.data.messages as any[])]
          .reverse()
          .map((item) => normalizeMessage(item))
          .filter((item): item is ChatMessage => item !== null),
      );
    }
  }, [history.data]);

  useEffect(() => {
    if (!isAuthenticated) return () => undefined;

    const unsub = on(SOCKET_EVENTS.DM.MESSAGE, (message: any) => {
      if (message?.conversationId && conversationId && message.conversationId !== conversationId) {
        return;
      }
      if (message?.deliveryId) {
        emit(SOCKET_EVENTS.DELIVERY.ACK, { deliveryId: message.deliveryId });
      }
      const normalized = normalizeMessage(message);
      if (!normalized) {
        return;
      }
      setMessages((previous) => [...previous, normalized]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      unsub?.();
    };
  }, [conversationId, emit, isAuthenticated, on]);

  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;
    emitWithAck(SOCKET_EVENTS.DM.READ_UPDATE, { conversationId }).catch(() => undefined);
  }, [conversationId, emitWithAck, isAuthenticated]);

  const handleTyping = () => {
    if (!resolvedRecipientId || !conversationId) return;
    emit(SOCKET_EVENTS.DM.TYPING_START, { recipientId: resolvedRecipientId, conversationId });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !resolvedRecipientId) return;

    setSendError(null);

    const response = await emitWithAck<{ ok: boolean; message?: any; error?: string }>(SOCKET_EVENTS.DM.SEND, {
      recipientId: resolvedRecipientId,
      conversationId,
      content: inputText.trim(),
      messageType: "TEXT",
    }).catch(() => ({ ok: false, error: "Unable to reach the messaging server." }));

    if (!response?.ok || !response.message) {
      const errorMessage = response?.error ?? "Unable to send message right now.";
      setSendError(errorMessage);
      Alert.alert("Message not sent", errorMessage);
      return;
    }

    const normalized = normalizeMessage(response.message);
    if (!normalized) {
      setSendError("The message was sent but could not be rendered.");
      return;
    }

    setMessages((previous) => [...previous, normalized]);
    setInputText("");
    flatListRef.current?.scrollToEnd({ animated: true });
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
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={10} />

      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(7,12,40,0.34)" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", marginRight: 12 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
          </TouchableOpacity>
          <Avatar uri={(recipientSummary.data as any)?.avatarUrl} size={46} online={(recipientSummary.data as any)?.presenceStatus === "ONLINE"} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800" }}>{(recipientSummary.data as any)?.displayName ?? "Conversation"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{headerSubtitle}</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700" }}>Secure DM</Text>
          </View>
        </View>
      </View>

      {history.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.white} />
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 14 }}>Loading conversation...</Text>
        </View>
      ) : history.error ? (
        <View style={{ flex: 1, padding: SPACING.md, justifyContent: "center" }}>
          <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800" }}>Unable to load messages</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>
              {history.error instanceof Error ? history.error.message : "Please try again in a moment."}
            </Text>
            <Button title="Retry" onPress={() => history.refetch()} style={{ marginTop: SPACING.md }} />
          </Card>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 8, flexGrow: messages.length === 0 ? 1 : undefined }}
          ListEmptyComponent={(
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 48 }}>
              <Avatar uri={(recipientSummary.data as any)?.avatarUrl} size={72} />
              <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800", marginTop: 18 }}>Start the conversation</Text>
              <Text style={{ color: "rgba(255,255,255,0.66)", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                Private messages sent here respect the recipient&apos;s inbox rules and live-link preferences.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isMe = item.senderId === userId;
            return (
              <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 10, alignItems: "flex-end" }}>
                {!isMe ? <Avatar uri={(recipientSummary.data as any)?.avatarUrl} size={30} /> : null}
                <View
                  style={{
                    maxWidth: "76%",
                    marginLeft: isMe ? 46 : 8,
                    marginRight: isMe ? 8 : 0,
                    borderRadius: 20,
                    overflow: "hidden",
                    borderBottomRightRadius: isMe ? 6 : 20,
                    borderBottomLeftRadius: isMe ? 20 : 6,
                    borderWidth: isMe ? 0 : 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: isMe ? undefined : "rgba(255,255,255,0.1)",
                  }}
                >
                  {isMe ? (
                    <LinearGradient colors={["#D653F2", "#46C8FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                      <Text style={{ color: COLORS.white, fontSize: 15, lineHeight: 20 }}>{item.content}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 10, marginTop: 6, textAlign: "right" }}>{formatMessageTime(item.createdAt)}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingHorizontal: 15, paddingVertical: 12 }}>
                      <Text style={{ color: COLORS.white, fontSize: 15, lineHeight: 20 }}>{item.content}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 10, marginTop: 6, textAlign: "right" }}>{formatMessageTime(item.createdAt)}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={{ flexDirection: "row", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", gap: 8, alignItems: "center", backgroundColor: "rgba(0,0,0,0.25)" }}>
        <View style={{ flex: 1 }}>
          {sendError ? <Text style={{ color: "#FFB3A8", fontSize: 12, marginBottom: 6 }}>{sendError}</Text> : null}
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (sendError) {
                setSendError(null);
              }
              handleTyping();
            }}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: RADIUS.full,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: COLORS.white,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
        </View>
        <TouchableOpacity onPress={sendMessage} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: inputText.trim() ? "#46C8FF" : "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons color={COLORS.white} name="send" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
