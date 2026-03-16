import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketToken: string | null = null;

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

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
