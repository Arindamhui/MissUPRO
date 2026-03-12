import { CanActivate, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Injectable()
export class RealtimeAuthGuard implements CanActivate {
  async canActivate(context: any): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new WsException("Missing authentication token");
    }

    try {
      // Clerk token verification would go here
      // For now extract userId from handshake
      const userId = client.handshake.auth?.userId;
      if (!userId) throw new WsException("Invalid token");

      (client as any).userId = userId;
      return true;
    } catch {
      throw new WsException("Authentication failed");
    }
  }
}
