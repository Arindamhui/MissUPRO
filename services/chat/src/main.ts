import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "chat";
const port = Number(process.env["PORT"] ?? "4102");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

let connectedSockets = 0;
let publishedMessages = 0;

const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service, status: "ok", startedAt, realtime: "socket.io" }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end(
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}\n` +
      `service_connected_sockets{service="${service}"} ${connectedSockets}\n` +
      `service_published_messages_total{service="${service}"} ${publishedMessages}\n`,
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

io.on("connection", (socket) => {
  connectedSockets += 1;
  const userId = String(socket.handshake.auth?.userId ?? "");

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);

  socket.on("stream.join", (payload: { roomId: string }) => {
    if (!payload?.roomId) return;
    socket.join(`stream:${payload.roomId}`);
  });

  socket.on("stream.leave", (payload: { roomId: string }) => {
    if (!payload?.roomId) return;
    socket.leave(`stream:${payload.roomId}`);
  });

  socket.on("stream.chat", (payload: { roomId: string; message: string }, ack?: (result: { ok: boolean; id?: string }) => void) => {
    if (!payload?.roomId || !payload?.message) {
      ack?.({ ok: false });
      return;
    }

    const messageId = randomUUID();
    io.to(`stream:${payload.roomId}`).emit("stream.chat.message", {
      id: messageId,
      roomId: payload.roomId,
      message: payload.message,
      senderUserId: userId,
      createdAt: new Date().toISOString(),
    });
    publishedMessages += 1;
    ack?.({ ok: true, id: messageId });
  });

  socket.on("dm.message.send", (payload: { recipientId: string; message: string }, ack?: (result: { ok: boolean; id?: string }) => void) => {
    if (!payload?.recipientId || !payload?.message) {
      ack?.({ ok: false });
      return;
    }

    const messageId = randomUUID();
    io.to(`user:${payload.recipientId}`).emit("dm.message.new", {
      id: messageId,
      senderUserId: userId,
      message: payload.message,
      createdAt: new Date().toISOString(),
    });
    publishedMessages += 1;
    ack?.({ ok: true, id: messageId });
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
