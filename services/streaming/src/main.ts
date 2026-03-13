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
