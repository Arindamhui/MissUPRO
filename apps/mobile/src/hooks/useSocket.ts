import { useEffect, useRef, useCallback } from "react";
import { router } from "expo-router";
import { getSocket, releaseSocket, retainSocket } from "@/lib/socket";
import { useAuthStore

 } from "@/store";
import { SOCKET_EVENTS } from "@missu/types";
import { useCallStore } from "@/store";
import { trpc } from "@/lib/trpc";

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!token) return;
    socketRef.current = retainSocket(token);
    const socket = socketRef.current;
    const heartbeat = () => {
      socket.emit(SOCKET_EVENTS.PRESENCE.HEARTBEAT, { status: "online" });
    };
    socket.on("connect", heartbeat);
    heartbeat();

    return () => {
      socket.off("connect", heartbeat);
      releaseSocket();
      socketRef.current = null;
    };
  }, [token]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const emitWithAck = useCallback(<TResponse = unknown,>(event: string, data: any, timeoutMs = 5000) => {
    return new Promise<TResponse>((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error("Socket not connected"));
        return;
      }

      socketRef.current.timeout(timeoutMs).emit(event, data, (error: Error | null, response: TResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      });
    });
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { emit, emitWithAck, on, socket: socketRef.current };
}

export function useCallSocket() {
  const { on } = useSocket();
  const { acceptCall, endCall, setLowBalance } = useCallStore();
  const utils = trpc.useContext();

  useEffect(() => {
    const invalidateNotifications = () => {
      void utils.notification.getNotificationCenter.invalidate();
    };

    const unsub1 = on(SOCKET_EVENTS.CALL.INCOMING, (data: any) => {
      if (data?.deliveryId) {
        sendSocketAck(data.deliveryId);
      }
      useCallStore.getState().startCall(data.callSessionId, data.callType, data.callerId, "incoming");
      router.push(`/call/${data.callSessionId}`);
    });
    const unsub2 = on(SOCKET_EVENTS.CALL.ACCEPTED, (data: any) => {
      if (data?.deliveryId) {
        sendSocketAck(data.deliveryId);
      }
      acceptCall(data.callSessionId, data.agoraChannel, data.agoraToken, data.agoraAppId, data.expiresAt);
    });
    const unsub3 = on(SOCKET_EVENTS.CALL.ENDED, () => {
      endCall();
    });
    const unsub4 = on(SOCKET_EVENTS.CALL.REJECTED, () => {
      endCall();
    });
    const unsub5 = on(SOCKET_EVENTS.CALL.LOW_BALANCE, () => {
      setLowBalance(true);
    });
    const unsub6 = on(SOCKET_EVENTS.CALL.INSUFFICIENT_BALANCE, () => {
      setLowBalance(true);
      endCall();
    });
    const unsub7 = on(SOCKET_EVENTS.CALL.SESSION_ENDED, () => {
      endCall();
    });
    const unsub8 = on(SOCKET_EVENTS.NOTIFICATION.NEW, (payload: any) => {
      if (payload?.deliveryId) {
        sendSocketAck(payload.deliveryId);
      }
      invalidateNotifications();
    });
    const unsub9 = on(SOCKET_EVENTS.NOTIFICATION.READ, invalidateNotifications);
    const unsub10 = on(SOCKET_EVENTS.NOTIFICATION.ALL_READ, invalidateNotifications);
    const unsub11 = on(SOCKET_EVENTS.NOTIFICATION.DELETED, invalidateNotifications);
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
      unsub5?.();
      unsub6?.();
      unsub7?.();
      unsub8?.();
      unsub9?.();
      unsub10?.();
      unsub11?.();
    };
  }, [on, acceptCall, endCall, setLowBalance, utils]);
}

export function usePresence() {
  const { emit, on } = useSocket();

  const subscribe = useCallback((callback: (data: { userId: string; status: string }) => void) => {
    return on(SOCKET_EVENTS.PRESENCE.STATUS_CHANGED, callback);
  }, [on]);

  const watchUsers = useCallback((userIds: string[]) => {
    emit(SOCKET_EVENTS.PRESENCE.SUBSCRIBE, { userIds });
  }, [emit]);

  return { subscribe, watchUsers };
}

function sendSocketAck(deliveryId: string) {
  const token = useAuthStore.getState().token;
  if (!token) return;
  const socket = getSocket(token);
  socket?.emit(SOCKET_EVENTS.DELIVERY.ACK, { deliveryId });
}
