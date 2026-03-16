import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class SocketEmitterService {
  private server: Server | null = null;

  registerServer(server: Server) {
    this.server = server;
  }

  emitToRoom(roomName: string, roomId: string, event: string, payload: Record<string, unknown>) {
    this.server?.to(`${roomName}:${roomId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}