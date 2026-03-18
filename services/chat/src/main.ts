import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "chat";
const port = Number(process.env["PORT"] ?? "4102");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"];
const dmHistory = new Map<string, string[]>();

let connectedSockets = 0;
let publishedMessages = 0;
let dmMessages = 0;
let typingEvents = 0;
let readReceipts = 0;

const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service, status: "ok", startedAt, realtime: "socket.io",
      counters: { connectedSockets, publishedMessages, dmMessages, typingEvents, readReceipts },
    }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `service_connected_sockets{service="${service}"} ${connectedSockets}`,
      `service_published_messages_total{service="${service}"} ${publishedMessages}`,
      `chat_dm_messages_total{service="${service}"} ${dmMessages}`,
      `chat_typing_events_total{service="${service}"} ${typingEvents}`,
      `chat_read_receipts_total{service="${service}"} ${readReceipts}`,
    ].join("\n") + "\n");
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
});

const pubClient = redisUrl ? new Redis(redisUrl) : null;
const subClient = pubClient?.duplicate() ?? null;

pubClient?.on("error", () => undefined);
subClient?.on("error", () => undefined);

if (pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
} else {
  console.warn(`[${service}] REDIS_URL not set; using in-memory chat history for local dev.`);
}

const appendMessageHistory = (key: string, value: string) => {
  if (pubClient) {
    void pubClient.lpush(key, value);
    void pubClient.ltrim(key, 0, 499);
    return;
  }

  const history = dmHistory.get(key) ?? [];
  history.unshift(value);
  if (history.length > 500) {
    history.length = 500;
  }
  dmHistory.set(key, history);
};

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

  socket.on("dm.message.send", (payload: { recipientId: string; message: string; messageType?: string }, ack?: (result: { ok: boolean; id?: string }) => void) => {
    if (!payload?.recipientId || !payload?.message) {
      ack?.({ ok: false });
      return;
    }

    const messageId = randomUUID();
    io.to(`user:${payload.recipientId}`).emit("dm.message.new", {
      id: messageId,
      senderUserId: userId,
      message: payload.message,
      messageType: payload.messageType ?? "TEXT",
      createdAt: new Date().toISOString(),
    });
    // Store in Redis for message history
    appendMessageHistory(`dm:history:${[userId, payload.recipientId].sort().join(":")}`, JSON.stringify({
      id: messageId, senderUserId: userId, recipientId: payload.recipientId,
      message: payload.message, messageType: payload.messageType ?? "TEXT",
      createdAt: new Date().toISOString(),
    }));
    publishedMessages += 1;
    dmMessages += 1;
    ack?.({ ok: true, id: messageId });
  });

  // Typing indicators
  socket.on("dm.typing.start", (payload: { recipientId: string }) => {
    if (!payload?.recipientId) return;
    io.to(`user:${payload.recipientId}`).emit("dm.typing", { userId, typing: true });
    typingEvents += 1;
  });

  socket.on("dm.typing.stop", (payload: { recipientId: string }) => {
    if (!payload?.recipientId) return;
    io.to(`user:${payload.recipientId}`).emit("dm.typing", { userId, typing: false });
  });

  // Read receipts
  socket.on("dm.read", (payload: { conversationId: string; lastMessageId: string }) => {
    if (!payload?.conversationId || !payload?.lastMessageId) return;
    readReceipts += 1;
    if (pubClient) {
      void pubClient.publish("dm:read_receipts", JSON.stringify({
        conversationId: payload.conversationId,
        readBy: userId,
        lastMessageId: payload.lastMessageId,
        at: new Date().toISOString(),
      }));
    }
  });

  // Message history retrieval
  socket.on("dm.history", (payload: { otherUserId: string; limit?: number }, ack?: (r: { ok: boolean; messages?: unknown[] }) => void) => {
    if (!payload?.otherUserId) { ack?.({ ok: false }); return; }
    const key = `dm:history:${[userId, payload.otherUserId].sort().join(":")}`;
    const limit = Math.min(payload.limit ?? 50, 100);
    if (pubClient) {
      pubClient.lrange(key, 0, limit - 1).then(items => {
        ack?.({ ok: true, messages: items.map(i => JSON.parse(i)) });
      }).catch(() => {
        ack?.({ ok: false });
      });
      return;
    }

    try {
      const items = (dmHistory.get(key) ?? []).slice(0, limit).map((item) => JSON.parse(item));
      ack?.({ ok: true, messages: items });
    } catch {
      ack?.({ ok: false });
    }
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
    await Promise.allSettled([
      pubClient ? pubClient.quit() : Promise.resolve("skipped"),
      subClient ? subClient.quit() : Promise.resolve("skipped"),
    ]);
    httpServer.close(() => process.exit(0));
  });
}
