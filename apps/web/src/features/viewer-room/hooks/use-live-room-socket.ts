"use client";

import { SOCKET_EVENTS } from "@missu/types";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ChatMessage = {
  id: string;
  userId?: string;
  username: string;
  message: string;
  createdAt: string;
  timestamp?: number;
};

type GiftEvent = {
  deliveryId?: string;
  senderName?: string;
  giftName?: string;
  quantity?: number;
  emittedAt?: string;
};

type StreamSyncPayload = {
  viewerCount?: number;
  recentMessages?: ChatMessage[];
};

function dedupeMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();

  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  }).slice(-60);
}

export function useLiveRoomSocket({
  authToken,
  roomId,
  initialMessages,
  initialViewerCount,
}: {
  authToken: string | null;
  roomId: string;
  initialMessages: ChatMessage[];
  initialViewerCount: number;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<"locked" | "connecting" | "connected" | "disconnected" | "error">(
    authToken ? "connecting" : "locked",
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [viewerCount, setViewerCount] = useState(initialViewerCount);
  const [giftEvents, setGiftEvents] = useState<GiftEvent[]>([]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, roomId]);

  useEffect(() => {
    setViewerCount(initialViewerCount);
  }, [initialViewerCount, roomId]);

  useEffect(() => {
    if (!authToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionState("locked");
      return;
    }

    setConnectionState("connecting");

    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000", {
      auth: { token: authToken },
      autoConnect: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionState("connected");
      socket.emit(SOCKET_EVENTS.STREAM.JOIN, { roomId });
      socket.emit(SOCKET_EVENTS.STREAM.SYNC_REQUEST, { roomId, limit: 30 });
    };

    const handleDisconnect = () => {
      setConnectionState("disconnected");
    };

    const handleConnectError = () => {
      setConnectionState("error");
    };

    const handleChatMessage = (message: ChatMessage) => {
      setMessages((current) => dedupeMessages([...current, message]));
    };

    const handleSyncState = (payload: StreamSyncPayload) => {
      setViewerCount(Number(payload.viewerCount ?? initialViewerCount));
      if (Array.isArray(payload.recentMessages)) {
        setMessages(dedupeMessages(payload.recentMessages));
      }
    };

    const handleViewerPresence = (payload: { viewerCount?: number }) => {
      setViewerCount((current) => Number(payload.viewerCount ?? current));
    };

    const handleGiftEvent = (payload: GiftEvent) => {
      setGiftEvents((current) => [payload, ...current].slice(0, 4));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on(SOCKET_EVENTS.STREAM.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.STREAM.SYNC_STATE, handleSyncState);
    socket.on(SOCKET_EVENTS.STREAM.VIEWER_JOINED, handleViewerPresence);
    socket.on(SOCKET_EVENTS.STREAM.VIEWER_LEFT, handleViewerPresence);
    socket.on(SOCKET_EVENTS.STREAM.VIEWER_COUNT, handleViewerPresence);
    socket.on(SOCKET_EVENTS.GIFT.RECEIVED_LIVE, handleGiftEvent);

    return () => {
      socket.emit(SOCKET_EVENTS.STREAM.LEAVE, { roomId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off(SOCKET_EVENTS.STREAM.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.STREAM.SYNC_STATE, handleSyncState);
      socket.off(SOCKET_EVENTS.STREAM.VIEWER_JOINED, handleViewerPresence);
      socket.off(SOCKET_EVENTS.STREAM.VIEWER_LEFT, handleViewerPresence);
      socket.off(SOCKET_EVENTS.STREAM.VIEWER_COUNT, handleViewerPresence);
      socket.off(SOCKET_EVENTS.GIFT.RECEIVED_LIVE, handleGiftEvent);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authToken, initialViewerCount, roomId]);

  return {
    connectionState,
    messages,
    viewerCount,
    giftEvents,
    sendChatMessage(message: string) {
      const content = message.trim();
      if (!socketRef.current || !content) {
        return false;
      }

      socketRef.current.emit(SOCKET_EVENTS.STREAM.CHAT, { roomId, message: content });
      return true;
    },
    emitGiftEvent(payload: { giftId: string; giftName: string; senderName: string; quantity: number; effect: string }) {
      if (!socketRef.current) {
        return;
      }

      socketRef.current.emit(SOCKET_EVENTS.GIFT.SENT_LIVE, {
        roomId,
        giftId: payload.giftId,
        giftName: payload.giftName,
        senderName: payload.senderName,
        quantity: payload.quantity,
        effect: payload.effect,
      });
    },
  };
}