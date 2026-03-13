import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { PresenceService } from "./presence.service";
import { SOCKET_EVENTS } from "@missu/types";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedis } from "@missu/utils";
import type Redis from "ioredis";

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/",
  transports: ["websocket", "polling"],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private redisPubClient: Redis | null = null;
  private redisSubClient: Redis | null = null;
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly presenceService: PresenceService) {}

  async afterInit() {
    const redis = getRedis();
    await redis.connect();

    this.redisPubClient = redis;
    this.redisSubClient = redis.duplicate();
    await this.redisSubClient.connect();

    this.server.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
    this.logger.log("Socket.io Redis adapter initialized");
  }

  async onModuleDestroy() {
    try {
      if (this.redisSubClient) {
        await this.redisSubClient.quit();
      }
    } catch {
      this.logger.warn("Failed to close Socket.io Redis sub client cleanly");
    }
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    (client as any).userId = userId;

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join user's personal room
    client.join(`user:${userId}`);

    // Set presence
    await this.presenceService.setOnline(userId);

    // Broadcast presence
    this.server.emit(SOCKET_EVENTS.PRESENCE.STATUS_CHANGED, { userId, status: "online" });
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.presenceService.setOffline(userId);
        this.server.emit(SOCKET_EVENTS.PRESENCE.STATUS_CHANGED, { userId, status: "offline" });
      }
    }
  }

  // ─── Call Events ───
  @SubscribeMessage(SOCKET_EVENTS.CALL.REQUEST)
  handleCallRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; callType: string; callSessionId: string }) {
    this.server.to(`user:${data.targetUserId}`).emit(SOCKET_EVENTS.CALL.INCOMING, {
      callSessionId: data.callSessionId,
      callerId: (client as any).userId,
      callType: data.callType,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.ACCEPT)
  handleCallAccept(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; callerId: string; agoraChannel: string; agoraToken: string }) {
    this.server.to(`user:${data.callerId}`).emit(SOCKET_EVENTS.CALL.ACCEPTED, {
      callSessionId: data.callSessionId,
      agoraChannel: data.agoraChannel,
      agoraToken: data.agoraToken,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.REJECT)
  handleCallReject(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; callerId: string }) {
    this.server.to(`user:${data.callerId}`).emit(SOCKET_EVENTS.CALL.REJECTED, {
      callSessionId: data.callSessionId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.END)
  handleCallEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; otherUserId: string }) {
    this.server.to(`user:${data.otherUserId}`).emit(SOCKET_EVENTS.CALL.ENDED, {
      callSessionId: data.callSessionId,
    });
  }

  // ─── Live Stream Events ───
  @SubscribeMessage(SOCKET_EVENTS.GIFT.SENT_LIVE)
  handleLiveGift(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; giftId: string; giftName: string; senderName: string; effect: string; quantity: number }) {
    this.server.to(`stream:${data.roomId}`).emit(SOCKET_EVENTS.GIFT.RECEIVED_LIVE, {
      ...data,
      senderId: (client as any).userId,
    });
  }

  @SubscribeMessage("stream:join")
  handleStreamJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`stream:${data.roomId}`);
    this.server.to(`stream:${data.roomId}`).emit("stream:viewer_joined", {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage("stream:leave")
  handleStreamLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(`stream:${data.roomId}`);
    this.server.to(`stream:${data.roomId}`).emit("stream:viewer_left", {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage("stream:chat")
  handleStreamChat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string }) {
    this.server.to(`stream:${data.roomId}`).emit("stream:chat_message", {
      userId: (client as any).userId,
      message: data.message,
      timestamp: Date.now(),
    });
  }

  // ─── PK Events ───
  @SubscribeMessage(SOCKET_EVENTS.PK.SCORE_UPDATE)
  handlePkScoreUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; scores: any }) {
    this.server.to(`pk:${data.sessionId}`).emit(SOCKET_EVENTS.PK.SCORE_UPDATE, data);
  }

  @SubscribeMessage("pk:join")
  handlePkJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    client.join(`pk:${data.sessionId}`);
  }

  // ─── Game Events ───
  @SubscribeMessage(SOCKET_EVENTS.GAME.MOVE)
  handleGameMove(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; move: any }) {
    this.server.to(`game:${data.sessionId}`).emit(SOCKET_EVENTS.GAME.STATE_DELTA, {
      sessionId: data.sessionId,
      move: data.move,
      playerId: (client as any).userId,
    });
  }

  @SubscribeMessage("game:join")
  handleGameJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    client.join(`game:${data.sessionId}`);
  }

  // ─── DM Events ───
  @SubscribeMessage(SOCKET_EVENTS.DM.SEND)
  handleDmSend(@ConnectedSocket() client: Socket, @MessageBody() data: { recipientId: string; message: any }) {
    this.server.to(`user:${data.recipientId}`).emit(SOCKET_EVENTS.DM.MESSAGE, {
      ...data.message,
      senderId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.DM.TYPING_START)
  handleDmTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { recipientId: string; conversationId: string }) {
    this.server.to(`user:${data.recipientId}`).emit(SOCKET_EVENTS.DM.TYPING_START, {
      conversationId: data.conversationId,
      userId: (client as any).userId,
    });
  }

  // ─── Group Audio Events ───
  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.JOIN)
  handleGroupAudioJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`ga:${data.roomId}`);
    this.server.to(`ga:${data.roomId}`).emit(SOCKET_EVENTS.GROUP_AUDIO.MEMBER_JOINED, {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.LEAVE)
  handleGroupAudioLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(`ga:${data.roomId}`);
    this.server.to(`ga:${data.roomId}`).emit(SOCKET_EVENTS.GROUP_AUDIO.MEMBER_LEFT, {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.HAND_RAISE)
  handleGroupAudioRaiseHand(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    this.server.to(`ga:${data.roomId}`).emit(SOCKET_EVENTS.GROUP_AUDIO.HAND_RAISE, {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.REACTION)
  handleGroupAudioReaction(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; reaction: string }) {
    this.server.to(`ga:${data.roomId}`).emit(SOCKET_EVENTS.GROUP_AUDIO.REACTION, {
      userId: (client as any).userId,
      reaction: data.reaction,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.MUTE_TOGGLE)
  handleGroupAudioMuteToggle(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; isMuted: boolean }) {
    this.server.to(`ga:${data.roomId}`).emit(SOCKET_EVENTS.GROUP_AUDIO.MUTE_TOGGLE, {
      userId: (client as any).userId,
      isMuted: data.isMuted,
    });
  }

  // ─── Party Events ───
  @SubscribeMessage(SOCKET_EVENTS.PARTY.JOIN)
  handlePartyJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`party:${data.roomId}`);
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.MEMBER_JOINED, {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.LEAVE)
  handlePartyLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(`party:${data.roomId}`);
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.MEMBER_LEFT, {
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.CHAT)
  handlePartyChat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string }) {
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.CHAT, {
      userId: (client as any).userId,
      message: data.message,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.REACTION)
  handlePartyReaction(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; reaction: string }) {
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.REACTION, {
      userId: (client as any).userId,
      reaction: data.reaction,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.SEAT_UPDATE)
  handlePartySeatUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; seatNumber: number; action: string }) {
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.SEAT_UPDATE, {
      userId: (client as any).userId,
      ...data,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.ACTIVITY_UPDATE)
  handlePartyActivityUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; activityId: string; update: any }) {
    this.server.to(`party:${data.roomId}`).emit(SOCKET_EVENTS.PARTY.ACTIVITY_UPDATE, {
      ...data,
      userId: (client as any).userId,
    });
  }

  // ─── Discovery Events ───
  @SubscribeMessage("discovery.model.online")
  handleModelOnline(@ConnectedSocket() client: Socket, @MessageBody() data: { modelId: string }) {
    this.server.emit("discovery.model.online", {
      modelId: data.modelId,
      userId: (client as any).userId,
    });
  }

  @SubscribeMessage("discovery.model.offline")
  handleModelOffline(@ConnectedSocket() client: Socket, @MessageBody() data: { modelId: string }) {
    this.server.emit("discovery.model.offline", {
      modelId: data.modelId,
      userId: (client as any).userId,
    });
  }

  // ─── Utility: emit to specific user ───
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── Utility: emit to room ───
  emitToRoom(roomPrefix: string, roomId: string, event: string, data: any) {
    this.server.to(`${roomPrefix}:${roomId}`).emit(event, data);
  }
}
