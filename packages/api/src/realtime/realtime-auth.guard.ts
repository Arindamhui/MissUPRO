import { CanActivate, Injectable } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Injectable()
export class RealtimeAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: any): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const authHeader = client.handshake.headers?.authorization;
    const token = client.handshake.auth?.token || this.authService.extractBearerToken(authHeader as string | string[] | undefined);

    if (!token) {
      throw new WsException("Missing authentication token");
    }

    try {
      const authenticatedUser = await this.authService.authenticateToken(token);
      (client as any).userId = authenticatedUser.userId;
      return true;
    } catch {
      throw new WsException("Authentication failed");
    }
  }
}
