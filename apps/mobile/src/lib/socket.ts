import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketToken: string | null = null;
let socketConsumers = 0;

function resolveSocketUrl() {
  const fallback = Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";

  const configured = process.env.EXPO_PUBLIC_WS_URL ?? fallback;

  if (Platform.OS !== "android") {
    return configured;
  }

  return configured
    .replace("://localhost", "://10.0.2.2")
    .replace("://127.0.0.1", "://10.0.2.2");
}

export function getSocket(token: string): Socket {
  if (!socket || socketToken !== token) {
    socket?.disconnect();
    socket = io(resolveSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });
    socketToken = token;
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function retainSocket(token: string): Socket {
  const instance = getSocket(token);
  socketConsumers += 1;
  return instance;
}

export function releaseSocket() {
  socketConsumers = Math.max(0, socketConsumers - 1);

  if (socket && socketConsumers === 0) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}

export function disconnectSocket() {
  socketConsumers = 0;

  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
