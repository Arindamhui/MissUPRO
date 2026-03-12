import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { useAuthStore

 } from "@/store";
import { SOCKET_EVENTS } from "@missu/types";
import { useCallStore } from "@/store";

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!token) return;
    socketRef.current = getSocket(token);
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return { emit, on, socket: socketRef.current };
}

export function useCallSocket() {
  const { on } = useSocket();
  const { acceptCall, endCall } = useCallStore();

  useEffect(() => {
    const unsub1 = on(SOCKET_EVENTS.CALL.INCOMING, (data: any) => {
      // Show incoming call UI
      useCallStore.getState().startCall(data.callSessionId, data.callType, data.callerId);
    });
    const unsub2 = on(SOCKET_EVENTS.CALL.ACCEPTED, (data: any) => {
      acceptCall(data.callSessionId, data.agoraChannel, data.agoraToken);
    });
    const unsub3 = on(SOCKET_EVENTS.CALL.ENDED, () => {
      endCall();
    });
    const unsub4 = on(SOCKET_EVENTS.CALL.REJECTED, () => {
      endCall();
    });
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
    };
  }, [on, acceptCall, endCall]);
}

export function usePresence() {
  const { on } = useSocket();

  const subscribe = useCallback((callback: (data: { userId: string; status: string }) => void) => {
    return on(SOCKET_EVENTS.PRESENCE.STATUS_CHANGED, callback);
  }, [on]);

  return { subscribe };
}
