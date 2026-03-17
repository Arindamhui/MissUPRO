import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PresenceService } from "./presence.service";
import { SOCKET_EVENTS } from "@missu/types";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedis } from "@missu/utils";
import type Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { RealtimeStateService } from "./realtime-state.service";
import { PartyService } from "../party/party.service";
import { GroupAudioService } from "../group-audio/group-audio.service";
import { LiveService } from "../streaming/live.service";
import { GameService } from "../games/game.service";
import { CallService } from "../calls/call.service";
import { SocialService } from "../social/social.service";
import { ModerationService } from "../moderation/moderation.service";
import { SocketEmitterService } from "../common/socket-emitter.service";

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

  constructor(
    private readonly presenceService: PresenceService,
    private readonly authService: AuthService,
    private readonly realtimeStateService: RealtimeStateService,
    private readonly partyService: PartyService,
    private readonly groupAudioService: GroupAudioService,
    private readonly liveService: LiveService,
    private readonly gameService: GameService,
    private readonly callService: CallService,
    private readonly socialService: SocialService,
    private readonly moderationService: ModerationService,
    private readonly socketEmitterService: SocketEmitterService,
  ) {}

  private getUserId(client: Socket) {
    return (client as any).userId as string;
  }

  private async emitTrackedRoomEvent(
    roomScope: "stream" | "party" | "group_audio" | "game" | "pk",
    roomId: string,
    roomName: string,
    event: string,
    payload: Record<string, unknown>,
    critical = false,
  ) {
    const deliveryId = randomUUID();
    const enrichedPayload = { ...payload, deliveryId, emittedAt: new Date().toISOString() };
    await this.realtimeStateService.appendRecentEvent({
      deliveryId,
      event,
      roomId,
      roomScope,
      payload: enrichedPayload,
      critical,
      createdAt: new Date().toISOString(),
    });
    this.socketEmitterService.emitToRoom(roomName, roomId, event, enrichedPayload);
    return enrichedPayload;
  }

  private async emitTrackedUserEvent(userId: string, event: string, payload: Record<string, unknown>, critical = false) {
    const deliveryId = randomUUID();
    const enrichedPayload = { ...payload, deliveryId, emittedAt: new Date().toISOString() };
    await this.realtimeStateService.appendRecentEvent({
      deliveryId,
      event,
      roomId: userId,
      roomScope: "user",
      payload: enrichedPayload,
      critical,
      createdAt: new Date().toISOString(),
    });
    this.socketEmitterService.emitToUser(userId, event, enrichedPayload);
    return enrichedPayload;
  }

  private async emitStreamViewerState(roomId: string, userId: string, event: string) {
    const occupancy = await this.realtimeStateService.getRoomOccupancy("stream", roomId);
    const payload = {
      userId,
      viewerCount: occupancy.viewerCount,
    };

    await this.emitTrackedRoomEvent("stream", roomId, "stream", event, payload);
    await this.emitTrackedRoomEvent("stream", roomId, "stream", SOCKET_EVENTS.STREAM.VIEWER_COUNT, payload);

    return occupancy;
  }

  async afterInit() {
    this.socketEmitterService.registerServer(this.server);

    if (!process.env["REDIS_URL"]) {
      this.logger.warn("Realtime Redis adapter disabled: REDIS_URL is not configured");
      return;
    }

    const redis = getRedis();
    redis.on("error", (error) => {
      this.logger.warn(`Redis pub client unavailable for realtime adapter: ${error.message}`);
    });

    try {
      await redis.connect();

      this.redisPubClient = redis;
      this.redisSubClient = redis.duplicate();
      this.redisSubClient.on("error", (error) => {
        this.logger.warn(`Redis sub client unavailable for realtime adapter: ${error.message}`);
      });
      await this.redisSubClient.connect();

      this.server.adapter(createAdapter(this.redisPubClient, this.redisSubClient));
      this.logger.log("Socket.io Redis adapter initialized");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.redisPubClient = null;
      this.redisSubClient = null;
      this.logger.warn(`Realtime Redis adapter disabled: ${message}`);
    }
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
    const authHeader = client.handshake.headers?.authorization;
    const token = client.handshake.auth?.token || this.authService.extractBearerToken(authHeader as string | string[] | undefined);

    if (!token) {
      client.disconnect();
      return;
    }

    let userId: string;

    try {
      const authenticatedUser = await this.authService.authenticateToken(token);
      userId = authenticatedUser.userId;
    } catch {
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
    await this.realtimeStateService.joinRoom("user", userId, userId, client.id);

    const pendingUserEvents = await this.realtimeStateService.getPendingDeliveries("user", userId, 20);
    for (const pendingEvent of pendingUserEvents) {
      client.emit(pendingEvent.event, pendingEvent.payload);
    }

    // Set presence
    await this.presenceService.setOnline(userId);

    // Broadcast presence
    this.server.emit(SOCKET_EVENTS.PRESENCE.STATUS_CHANGED, { userId, status: "online" });
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    await this.realtimeStateService.leaveAllRoomsForSocket(userId, client.id);

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
  async handleCallRequest(@ConnectedSocket() client: Socket, @MessageBody() data: { targetUserId: string; callType: string; callSessionId: string }) {
    const state = await this.callService.getRealtimeState(data.callSessionId, this.getUserId(client), "publisher");
    await this.emitTrackedUserEvent(data.targetUserId, SOCKET_EVENTS.CALL.INCOMING, {
      callSessionId: data.callSessionId,
      callerId: this.getUserId(client),
      callType: data.callType,
      state,
    }, true);

    return { ok: true, state };
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.ACCEPT)
  async handleCallAccept(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; callerId: string }) {
    const accepted = await this.callService.acceptCall(data.callSessionId, this.getUserId(client));
    await this.emitTrackedUserEvent(data.callerId, SOCKET_EVENTS.CALL.ACCEPTED, {
      callSessionId: data.callSessionId,
      agoraChannel: accepted.agoraChannel,
      agoraToken: accepted.agoraToken,
      agoraAppId: accepted.agoraAppId,
      expiresAt: accepted.expiresAt,
    }, true);

    return { ok: true, accepted };
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.REJECT)
  async handleCallReject(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; callerId: string }) {
    await this.callService.rejectCall(data.callSessionId, this.getUserId(client));
    await this.emitTrackedUserEvent(data.callerId, SOCKET_EVENTS.CALL.REJECTED, {
      callSessionId: data.callSessionId,
    }, true);

    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.END)
  async handleCallEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { callSessionId: string; otherUserId: string }) {
    const ended = await this.callService.endCall(data.callSessionId, "USER_HANGUP");
    await this.emitTrackedUserEvent(data.otherUserId, SOCKET_EVENTS.CALL.ENDED, {
      callSessionId: data.callSessionId,
      ended,
    }, true);

    return { ok: true, ended };
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.SYNC_REQUEST)
  async handleCallSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSessionId: string; role?: "publisher" | "subscriber" },
  ) {
    const state = await this.callService.getRealtimeState(data.callSessionId, this.getUserId(client), data.role ?? "subscriber");
    client.emit(SOCKET_EVENTS.CALL.SYNC_STATE, {
      callSessionId: data.callSessionId,
      state,
    });

    return { ok: true, state };
  }

  @SubscribeMessage(SOCKET_EVENTS.CALL.BILLING_TICK)
  async handleCallBillingTick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callSessionId: string; tickNumber: number; userBalanceAfter: number; otherUserId: string },
  ) {
    const result = await this.callService.processBillingTick(data.callSessionId, data.tickNumber, data.userBalanceAfter);
    if (!result) {
      return { ok: false, error: "Call session is not active" };
    }

    await this.emitTrackedUserEvent(this.getUserId(client), SOCKET_EVENTS.CALL.BILLING_TICK, {
      callSessionId: data.callSessionId,
      tick: result.tick,
      classification: result.classification,
    });

    if (result.classification === "LOW_BALANCE") {
      await this.emitTrackedUserEvent(this.getUserId(client), SOCKET_EVENTS.CALL.LOW_BALANCE, {
        callSessionId: data.callSessionId,
        tickNumber: data.tickNumber,
        remainingBalance: data.userBalanceAfter,
      }, true);
    }

    if (result.classification === "INSUFFICIENT_BALANCE") {
      const endedPayload = {
        callSessionId: data.callSessionId,
        reason: "INSUFFICIENT_BALANCE",
      };
      await this.emitTrackedUserEvent(this.getUserId(client), SOCKET_EVENTS.CALL.INSUFFICIENT_BALANCE, endedPayload, true);
      await this.emitTrackedUserEvent(this.getUserId(client), SOCKET_EVENTS.CALL.SESSION_ENDED, endedPayload, true);
      await this.emitTrackedUserEvent(data.otherUserId, SOCKET_EVENTS.CALL.SESSION_ENDED, endedPayload, true);
    }

    return { ok: true, result };
  }

  // ─── Live Stream Events ───
  @SubscribeMessage(SOCKET_EVENTS.GIFT.SENT_LIVE)
  async handleLiveGift(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; giftId: string; giftName: string; senderName: string; effect: string; quantity: number }) {
    await this.emitTrackedRoomEvent("stream", data.roomId, "stream", SOCKET_EVENTS.GIFT.RECEIVED_LIVE, {
      ...data,
      senderId: this.getUserId(client),
    }, true);
  }

  @SubscribeMessage(SOCKET_EVENTS.STREAM.JOIN)
  async handleStreamJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.liveService.joinStream(data.roomId, this.getUserId(client));
    client.join(`stream:${data.roomId}`);
    await this.realtimeStateService.joinRoom("stream", data.roomId, this.getUserId(client), client.id);
    await this.emitStreamViewerState(data.roomId, this.getUserId(client), SOCKET_EVENTS.STREAM.VIEWER_JOINED);
  }

  @SubscribeMessage(SOCKET_EVENTS.STREAM.LEAVE)
  async handleStreamLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.liveService.leaveStream(data.roomId, this.getUserId(client));
    client.leave(`stream:${data.roomId}`);
    await this.realtimeStateService.leaveRoom("stream", data.roomId, this.getUserId(client), client.id);
    await this.emitStreamViewerState(data.roomId, this.getUserId(client), SOCKET_EVENTS.STREAM.VIEWER_LEFT);
  }

  @SubscribeMessage(SOCKET_EVENTS.STREAM.CHAT)
  async handleStreamChat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string }) {
    const userId = this.getUserId(client);
    const content = data.message.trim();

    if (!content) {
      return { ok: false, error: "Message content is required" };
    }

    const moderationResult = await this.moderationService.evaluateChatMessage(content, userId, {
      roomType: "LIVE_STREAM",
      roomId: data.roomId,
    });

    if (!moderationResult.allowed) {
      return {
        ok: false,
        error: "Message rejected by moderation",
        violations: moderationResult.violations,
      };
    }

    const chatMessage = await this.liveService.sendChatMessage(data.roomId, userId, moderationResult.sanitizedMessage.trim());

    await this.emitTrackedRoomEvent("stream", data.roomId, "stream", SOCKET_EVENTS.STREAM.CHAT_MESSAGE, chatMessage);

    return { ok: true, message: chatMessage };
  }

  @SubscribeMessage(SOCKET_EVENTS.STREAM.SYNC_REQUEST)
  async handleStreamSync(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; limit?: number }) {
    const [recentEvents, occupancy, recentMessages] = await Promise.all([
      this.realtimeStateService.getRecentEvents("stream", data.roomId, data.limit ?? 20),
      this.realtimeStateService.getRoomOccupancy("stream", data.roomId),
      this.liveService.getRecentChatMessages(data.roomId, data.limit ?? 30),
    ]);

    client.emit(SOCKET_EVENTS.STREAM.SYNC_STATE, {
      roomId: data.roomId,
      viewerCount: occupancy.viewerCount,
      recentEvents,
      recentMessages,
    });
  }

  // ─── PK Events ───
  @SubscribeMessage(SOCKET_EVENTS.PK.SCORE_UPDATE)
  async handlePkScoreUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; scores: { hostAScore?: number; hostBScore?: number } },
  ) {
    const state = await this.liveService.updatePKBattleScore(data.sessionId, this.getUserId(client), data.scores);
    await this.emitTrackedRoomEvent("pk", data.sessionId, "pk", SOCKET_EVENTS.PK.SCORE_UPDATE, {
      sessionId: data.sessionId,
      state,
    });

    return { ok: true, state };
  }

  @SubscribeMessage(SOCKET_EVENTS.PK.JOIN)
  async handlePkJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const state = await this.liveService.joinPKBattle(data.sessionId, this.getUserId(client));
    client.join(`pk:${data.sessionId}`);
    await this.realtimeStateService.joinRoom("pk", data.sessionId, this.getUserId(client), client.id);
    client.emit(SOCKET_EVENTS.PK.SYNC_STATE, {
      sessionId: data.sessionId,
      state,
    });

    return { ok: true, state };
  }

  @SubscribeMessage(SOCKET_EVENTS.PK.SYNC_REQUEST)
  async handlePkSync(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; limit?: number }) {
    const [state, recentEvents] = await Promise.all([
      this.liveService.getPKBattleRealtimeState(data.sessionId, data.limit ?? 20),
      this.realtimeStateService.getRecentEvents("pk", data.sessionId, data.limit ?? 20),
    ]);

    client.emit(SOCKET_EVENTS.PK.SYNC_STATE, {
      sessionId: data.sessionId,
      state,
      recentEvents,
    });
  }

  // ─── Game Events ───
  @SubscribeMessage(SOCKET_EVENTS.GAME.MOVE)
  async handleGameMove(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; move: any }) {
    const savedMove = await this.gameService.submitMove(data.sessionId, this.getUserId(client), data.move);
    await this.emitTrackedRoomEvent("game", data.sessionId, "game", SOCKET_EVENTS.GAME.STATE_DELTA, {
      sessionId: data.sessionId,
      move: savedMove,
      playerId: this.getUserId(client),
    });

    return { ok: true, move: savedMove };
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME.JOIN)
  async handleGameJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const state = await this.gameService.joinSession(data.sessionId, this.getUserId(client));
    client.join(`game:${data.sessionId}`);
    await this.realtimeStateService.joinRoom("game", data.sessionId, this.getUserId(client), client.id);
    client.emit(SOCKET_EVENTS.GAME.SYNC_STATE, {
      sessionId: data.sessionId,
      state,
    });

    return { ok: true, state };
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME.SYNC_REQUEST)
  async handleGameSync(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; limit?: number }) {
    const [state, recentEvents] = await Promise.all([
      this.gameService.getRealtimeState(data.sessionId, data.limit ?? 20),
      this.realtimeStateService.getRecentEvents("game", data.sessionId, data.limit ?? 20),
    ]);

    client.emit(SOCKET_EVENTS.GAME.SYNC_STATE, {
      sessionId: data.sessionId,
      state,
      recentEvents,
    });
  }

  // ─── DM Events ───
  @SubscribeMessage(SOCKET_EVENTS.DM.SEND)
  async handleDmSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; conversationId?: string; content?: string; messageType?: string; mediaUrl?: string; message?: { content?: string; type?: string; mediaUrl?: string } },
  ) {
    const senderId = this.getUserId(client);
    const content = data.content ?? data.message?.content ?? "";

    if (!content.trim()) {
      return { ok: false, error: "Message content is required" };
    }

    const moderationResult = await this.moderationService.evaluateChatMessage(content.trim(), senderId, {
      roomType: "DM",
      roomId: data.conversationId ?? data.recipientId,
    });

    if (!moderationResult.allowed) {
      return {
        ok: false,
        error: "Message rejected by moderation",
        violations: moderationResult.violations,
      };
    }

    const saved = await this.socialService.sendMessage(
      senderId,
      data.recipientId,
      moderationResult.sanitizedMessage.trim(),
      data.messageType ?? data.message?.type ?? "TEXT",
    );

    if (!saved.message) {
      return { ok: false, error: "Failed to persist message" };
    }

    const payload = {
      id: saved.message.id,
      conversationId: saved.conversation.id,
      senderId: saved.message.senderUserId,
      recipientId: data.recipientId,
      content: saved.message.contentText,
      mediaUrl: saved.message.mediaUrl,
      messageType: saved.message.messageType,
      createdAt: saved.message.createdAt.toISOString(),
      isRead: saved.message.isRead,
    };

    await this.emitTrackedUserEvent(data.recipientId, SOCKET_EVENTS.DM.MESSAGE, payload, true);

    return {
      ok: true,
      message: payload,
      conversation: {
        id: saved.conversation.id,
      },
    };
  }

  @SubscribeMessage(SOCKET_EVENTS.DM.TYPING_START)
  async handleDmTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { recipientId: string; conversationId: string }) {
    await this.emitTrackedUserEvent(data.recipientId, SOCKET_EVENTS.DM.TYPING_START, {
      conversationId: data.conversationId,
      userId: this.getUserId(client),
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.DM.READ_UPDATE)
  async handleDmReadUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const readReceipt = await this.socialService.markConversationRead(data.conversationId, this.getUserId(client));

    await this.emitTrackedUserEvent(readReceipt.otherUserId, SOCKET_EVENTS.DM.READ_UPDATE, readReceipt);

    return readReceipt;
  }

  // ─── Group Audio Events ───
  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.JOIN)
  async handleGroupAudioJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.groupAudioService.joinRoom(data.roomId, this.getUserId(client));
    client.join(`ga:${data.roomId}`);
    await this.realtimeStateService.joinRoom("group_audio", data.roomId, this.getUserId(client), client.id);
    const occupancy = await this.realtimeStateService.getRoomOccupancy("group_audio", data.roomId);
    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.MEMBER_JOINED, {
      userId: this.getUserId(client),
      participantCount: occupancy.viewerCount,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.LEAVE)
  async handleGroupAudioLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.groupAudioService.leaveRoom(data.roomId, this.getUserId(client));
    client.leave(`ga:${data.roomId}`);
    await this.realtimeStateService.leaveRoom("group_audio", data.roomId, this.getUserId(client), client.id);
    const occupancy = await this.realtimeStateService.getRoomOccupancy("group_audio", data.roomId);
    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.MEMBER_LEFT, {
      userId: this.getUserId(client),
      participantCount: occupancy.viewerCount,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.HAND_RAISE)
  async handleGroupAudioRaiseHand(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.HAND_RAISE, {
      userId: this.getUserId(client),
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.REACTION)
  async handleGroupAudioReaction(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; reaction: string }) {
    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.REACTION, {
      userId: this.getUserId(client),
      reaction: data.reaction,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.MUTE_TOGGLE)
  async handleGroupAudioMuteToggle(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; isMuted: boolean; muted?: boolean }) {
    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.MUTE_TOGGLE, {
      userId: this.getUserId(client),
      isMuted: data.isMuted ?? data.muted ?? false,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.CHAT)
  async handleGroupAudioChat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string }) {
    const userId = this.getUserId(client);
    const content = data.message.trim();

    if (!content) {
      return { ok: false, error: "Message content is required" };
    }

    const moderationResult = await this.moderationService.evaluateChatMessage(content, userId, {
      roomType: "GROUP_AUDIO",
      roomId: data.roomId,
    });

    if (!moderationResult.allowed) {
      return {
        ok: false,
        error: "Message rejected by moderation",
        violations: moderationResult.violations,
      };
    }

    const payload = {
      userId,
      message: moderationResult.sanitizedMessage.trim(),
      timestamp: Date.now(),
    };

    await this.emitTrackedRoomEvent("group_audio", data.roomId, "ga", SOCKET_EVENTS.GROUP_AUDIO.CHAT, payload);

    return { ok: true, message: payload };
  }

  @SubscribeMessage(SOCKET_EVENTS.GROUP_AUDIO.SYNC_REQUEST)
  async handleGroupAudioSync(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; limit?: number }) {
    const [roomState, recentEvents] = await Promise.all([
      this.groupAudioService.getRoomState(data.roomId),
      this.realtimeStateService.getRecentEvents("group_audio", data.roomId, data.limit ?? 20),
    ]);

    client.emit(SOCKET_EVENTS.GROUP_AUDIO.SYNC_STATE, {
      roomId: data.roomId,
      roomState,
      recentEvents,
    });
  }

  // ─── Party Events ───
  @SubscribeMessage(SOCKET_EVENTS.PARTY.JOIN)
  async handlePartyJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.partyService.joinRoom(data.roomId, this.getUserId(client));
    client.join(`party:${data.roomId}`);
    await this.realtimeStateService.joinRoom("party", data.roomId, this.getUserId(client), client.id);
    const occupancy = await this.realtimeStateService.getRoomOccupancy("party", data.roomId);
    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.MEMBER_JOINED, {
      userId: this.getUserId(client),
      memberCount: occupancy.viewerCount,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.LEAVE)
  async handlePartyLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    await this.partyService.leaveRoom(data.roomId, this.getUserId(client));
    client.leave(`party:${data.roomId}`);
    await this.realtimeStateService.leaveRoom("party", data.roomId, this.getUserId(client), client.id);
    const occupancy = await this.realtimeStateService.getRoomOccupancy("party", data.roomId);
    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.MEMBER_LEFT, {
      userId: this.getUserId(client),
      memberCount: occupancy.viewerCount,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.CHAT)
  async handlePartyChat(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; message: string }) {
    const userId = this.getUserId(client);
    const content = data.message.trim();

    if (!content) {
      return { ok: false, error: "Message content is required" };
    }

    const moderationResult = await this.moderationService.evaluateChatMessage(content, userId, {
      roomType: "PARTY",
      roomId: data.roomId,
    });

    if (!moderationResult.allowed) {
      return {
        ok: false,
        error: "Message rejected by moderation",
        violations: moderationResult.violations,
      };
    }

    const payload = {
      userId,
      message: moderationResult.sanitizedMessage.trim(),
      timestamp: Date.now(),
    };

    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.CHAT, payload);

    return { ok: true, message: payload };
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.REACTION)
  async handlePartyReaction(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; reaction: string }) {
    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.REACTION, {
      userId: this.getUserId(client),
      reaction: data.reaction,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.SEAT_UPDATE)
  async handlePartySeatUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; seatNumber: number; action: string }) {
    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.SEAT_UPDATE, {
      userId: this.getUserId(client),
      ...data,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.ACTIVITY_UPDATE)
  async handlePartyActivityUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; activityId: string; update: any }) {
    await this.emitTrackedRoomEvent("party", data.roomId, "party", SOCKET_EVENTS.PARTY.ACTIVITY_UPDATE, {
      ...data,
      userId: this.getUserId(client),
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.PARTY.SYNC_REQUEST)
  async handlePartySync(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; limit?: number }) {
    const [roomState, recentEvents] = await Promise.all([
      this.partyService.getRoomState(data.roomId),
      this.realtimeStateService.getRecentEvents("party", data.roomId, data.limit ?? 20),
    ]);

    client.emit(SOCKET_EVENTS.PARTY.SYNC_STATE, {
      roomId: data.roomId,
      roomState,
      recentEvents,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.GIFT.DELIVERY_ACK)
  async handleDeliveryAck(@MessageBody() data: { deliveryId: string }) {
    if (!data?.deliveryId) return { ok: false };
    await this.realtimeStateService.ackDelivery(data.deliveryId);
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.DELIVERY.ACK)
  async handleGenericDeliveryAck(@MessageBody() data: { deliveryId: string }) {
    if (!data?.deliveryId) return { ok: false };
    await this.realtimeStateService.ackDelivery(data.deliveryId);
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.PRESENCE.HEARTBEAT)
  async handlePresenceHeartbeat(@ConnectedSocket() client: Socket, @MessageBody() data?: { status?: string }) {
    const userId = this.getUserId(client);
    const status = data?.status ?? "online";
    await this.presenceService.heartbeat(userId, status, 90);
    return { ok: true, userId, status };
  }

  @SubscribeMessage(SOCKET_EVENTS.PRESENCE.SUBSCRIBE)
  async handlePresenceSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { userIds: string[] }) {
    for (const targetId of data?.userIds ?? []) {
      client.join(`presence:${targetId}`);
    }
    return { ok: true, count: data?.userIds?.length ?? 0 };
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
