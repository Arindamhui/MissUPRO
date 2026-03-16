import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "streaming";
const port = Number(process.env["PORT"] ?? "4101");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

let connectedSockets = 0;
let publishedEvents = 0;

const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service, status: "ok", startedAt, mode: "socket.io" }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end(
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}\n` +
      `service_connected_sockets{service="${service}"} ${connectedSockets}\n` +
      `service_published_events_total{service="${service}"} ${publishedEvents}\n`,
    );
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

const publishToRoom = (room: string, event: string, payload: Record<string, unknown>) => {
  io.to(room).emit(event, payload);
  publishedEvents += 1;
};

io.on("connection", (socket) => {
  connectedSockets += 1;
  const userId = String(socket.handshake.auth?.userId ?? "");

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);

  socket.on("call.request", (payload: { targetUserId: string; callType: string }, ack?: (r: { ok: boolean; sessionId?: string }) => void) => {
    if (!payload?.targetUserId || !payload?.callType) {
      ack?.({ ok: false });
      return;
    }
    const sessionId = randomUUID();
    publishToRoom(`user:${payload.targetUserId}`, "call.incoming", {
      sessionId,
      callerId: userId,
      callType: payload.callType,
      createdAt: new Date().toISOString(),
    });
    ack?.({ ok: true, sessionId });
  });

  socket.on("stream.join", (payload: { streamId: string }) => {
    if (!payload?.streamId) return;
    socket.join(`stream:${payload.streamId}`);
    publishToRoom(`stream:${payload.streamId}`, "stream.viewer.joined", {
      userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("group_audio.join", (payload: { roomId: string }) => {
    if (!payload?.roomId) return;
    socket.join(`ga:${payload.roomId}`);
    publishToRoom(`ga:${payload.roomId}`, "group_audio.participant.joined", {
      userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("party.join", (payload: { roomId: string }) => {
    if (!payload?.roomId) return;
    socket.join(`party:${payload.roomId}`);
    publishToRoom(`party:${payload.roomId}`, "party.member.joined", {
      userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("party.seat.update", (payload: { roomId: string; seatNumber: number; action: string }) => {
    if (!payload?.roomId) return;
    publishToRoom(`party:${payload.roomId}`, "party.seat.update", {
      userId,
      seatNumber: payload.seatNumber,
      action: payload.action,
      at: new Date().toISOString(),
    });
  });

  // Gift broadcast events
  socket.on("gift.send", (payload: { targetRoom: string; giftId: string; giftName: string; coinCost: number; receiverUserId: string; comboCount?: number; animationKey?: string }) => {
    if (!payload?.targetRoom || !payload?.giftId) return;
    publishToRoom(payload.targetRoom, "gift.broadcast", {
      senderId: userId,
      receiverUserId: payload.receiverUserId,
      giftId: payload.giftId,
      giftName: payload.giftName,
      coinCost: payload.coinCost,
      comboCount: payload.comboCount ?? 1,
      animationKey: payload.animationKey,
      at: new Date().toISOString(),
    });
  });

  // PK battle events
  socket.on("pk.score.update", (payload: { pkSessionId: string; hostAScore: number; hostBScore: number }) => {
    if (!payload?.pkSessionId) return;
    publishToRoom(`pk:${payload.pkSessionId}`, "pk.score.updated", {
      pkSessionId: payload.pkSessionId,
      hostAScore: payload.hostAScore,
      hostBScore: payload.hostBScore,
      at: new Date().toISOString(),
    });
  });

  socket.on("pk.join", (payload: { pkSessionId: string }) => {
    if (!payload?.pkSessionId) return;
    socket.join(`pk:${payload.pkSessionId}`);
    publishToRoom(`pk:${payload.pkSessionId}`, "pk.viewer.joined", {
      userId,
      at: new Date().toISOString(),
    });
  });

  // Group audio events
  socket.on("group_audio.hand_raise", (payload: { roomId: string }) => {
    if (!payload?.roomId) return;
    publishToRoom(`ga:${payload.roomId}`, "group_audio.hand_raised", {
      userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("group_audio.speaker_change", (payload: { roomId: string; targetUserId: string; action: "promote" | "demote" }) => {
    if (!payload?.roomId) return;
    publishToRoom(`ga:${payload.roomId}`, "group_audio.speaker_changed", {
      userId,
      targetUserId: payload.targetUserId,
      action: payload.action,
      at: new Date().toISOString(),
    });
  });

  socket.on("group_audio.mute", (payload: { roomId: string; targetUserId: string; muted: boolean }) => {
    if (!payload?.roomId) return;
    publishToRoom(`ga:${payload.roomId}`, "group_audio.mute_changed", {
      targetUserId: payload.targetUserId,
      muted: payload.muted,
      by: userId,
      at: new Date().toISOString(),
    });
  });

  // Party activity events
  socket.on("party.activity.start", (payload: { roomId: string; activityType: string; config?: Record<string, unknown> }) => {
    if (!payload?.roomId) return;
    publishToRoom(`party:${payload.roomId}`, "party.activity.started", {
      activityType: payload.activityType,
      config: payload.config,
      startedBy: userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("party.activity.action", (payload: { roomId: string; activityId: string; action: unknown }) => {
    if (!payload?.roomId) return;
    publishToRoom(`party:${payload.roomId}`, "party.activity.action", {
      activityId: payload.activityId,
      userId,
      action: payload.action,
      at: new Date().toISOString(),
    });
  });

  socket.on("party.chat", (payload: { roomId: string; message: string }) => {
    if (!payload?.roomId || !payload?.message) return;
    publishToRoom(`party:${payload.roomId}`, "party.chat.message", {
      userId,
      message: payload.message.slice(0, 500),
      messageId: randomUUID(),
      at: new Date().toISOString(),
    });
  });

  // Presence updates
  socket.on("presence.update", (payload: { status: "online" | "busy" | "in_call" | "streaming" }) => {
    if (!payload?.status) return;
    pubClient.set(`presence:${userId}`, payload.status, "EX", 90);
    pubClient.publish("presence:updates", JSON.stringify({ userId, status: payload.status, at: new Date().toISOString() }));
  });

  // Call signaling enhancements
  socket.on("call.accept", (payload: { sessionId: string; callerId: string }) => {
    if (!payload?.sessionId || !payload?.callerId) return;
    publishToRoom(`user:${payload.callerId}`, "call.accepted", {
      sessionId: payload.sessionId,
      modelId: userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("call.reject", (payload: { sessionId: string; callerId: string; reason?: string }) => {
    if (!payload?.sessionId || !payload?.callerId) return;
    publishToRoom(`user:${payload.callerId}`, "call.rejected", {
      sessionId: payload.sessionId,
      reason: payload.reason ?? "declined",
      at: new Date().toISOString(),
    });
  });

  socket.on("call.end", (payload: { sessionId: string; otherUserId: string; reason?: string }) => {
    if (!payload?.sessionId || !payload?.otherUserId) return;
    publishToRoom(`user:${payload.otherUserId}`, "call.ended", {
      sessionId: payload.sessionId,
      endedBy: userId,
      reason: payload.reason ?? "normal",
      at: new Date().toISOString(),
    });
  });

  // Stream chat
  socket.on("stream.chat", (payload: { streamId: string; message: string; messageType?: string }) => {
    if (!payload?.streamId || !payload?.message) return;
    publishToRoom(`stream:${payload.streamId}`, "stream.chat.message", {
      userId,
      message: payload.message.slice(0, 500),
      messageType: payload.messageType ?? "TEXT",
      messageId: randomUUID(),
      at: new Date().toISOString(),
    });
  });

  socket.on("stream.leave", (payload: { streamId: string }) => {
    if (!payload?.streamId) return;
    socket.leave(`stream:${payload.streamId}`);
    publishToRoom(`stream:${payload.streamId}`, "stream.viewer.left", {
      userId,
      at: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    connectedSockets = Math.max(0, connectedSockets - 1);
  });
});

httpServer.listen(port, () => {
  console.log(`[${service}] listening on :${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await pubClient.quit();
    await subClient.quit();
    httpServer.close(() => process.exit(0));
  });
}
