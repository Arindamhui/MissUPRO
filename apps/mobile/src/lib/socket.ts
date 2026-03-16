import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketToken: string | null = null;
let socketConsumers = 0;

export function getSocket(token: string): Socket {
  if (!socket || socketToken !== token) {
    socket?.disconnect();
    socket = io(process.env.EXPO_PUBLIC_WS_URL ?? "http://localhost:4000", {
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
