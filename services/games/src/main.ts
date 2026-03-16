import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const service = process.env["SERVICE_NAME"] ?? "games";
const port = Number(process.env["PORT"] ?? "4107");
const startedAt = new Date().toISOString();
const redisUrl = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";

let connectedSockets = 0;
let sessionsCreated = 0;
let movesProcessed = 0;
let sessionsEnded = 0;

type GameType = "ludo" | "chess" | "carrom" | "sudoku";
type GameStatus = "CREATED" | "ACTIVE" | "PAUSED" | "ENDED";

interface GameSession {
  id: string;
  callSessionId: string;
  gameType: GameType;
  status: GameStatus;
  players: { userId: string; seat: string; joinedAt: string }[];
  moves: { seq: number; userId: string; payload: unknown; at: string }[];
  state: Record<string, unknown>;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  winnerId?: string;
}

const activeSessions = new Map<string, GameSession>();

function initGameState(gameType: GameType): Record<string, unknown> {
  switch (gameType) {
    case "chess":
      return { board: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", turn: "white", moveCount: 0 };
    case "ludo":
      return { pieces: { red: [0,0,0,0], blue: [0,0,0,0], green: [0,0,0,0], yellow: [0,0,0,0] }, turn: "red", diceValue: null };
    case "carrom":
      return { coins: 9, queen: true, scores: {}, turn: null, striker: null };
    case "sudoku":
      return { grid: Array(81).fill(0), solution: Array(81).fill(0), difficulty: "medium", startedAt: null };
    default:
      return {};
  }
}

function validateMove(session: GameSession, userId: string, payload: unknown): { valid: boolean; error?: string } {
  if (session.status !== "ACTIVE") return { valid: false, error: "Game not active" };
  const player = session.players.find(p => p.userId === userId);
  if (!player) return { valid: false, error: "Not a player in this game" };
  if (!payload || typeof payload !== "object") return { valid: false, error: "Invalid move payload" };
  return { valid: true };
}

const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      service, status: "ok", startedAt,
      games: ["ludo", "chess", "carrom", "sudoku"],
      activeSessions: activeSessions.size,
      counters: { sessionsCreated, movesProcessed, sessionsEnded, connectedSockets },
    }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end([
      `service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}`,
      `game_sessions_created_total{service="${service}"} ${sessionsCreated}`,
      `game_moves_processed_total{service="${service}"} ${movesProcessed}`,
      `game_sessions_ended_total{service="${service}"} ${sessionsEnded}`,
      `game_active_sessions{service="${service}"} ${activeSessions.size}`,
      `service_connected_sockets{service="${service}"} ${connectedSockets}`,
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

const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

io.on("connection", (socket) => {
  connectedSockets += 1;
  const userId = String(socket.handshake.auth?.userId ?? "");
  if (!userId) { socket.disconnect(true); return; }

  socket.on("game.create", (payload: { callSessionId: string; gameType: GameType }, ack?: (r: { ok: boolean; sessionId?: string; error?: string }) => void) => {
    if (!payload?.callSessionId || !payload?.gameType) {
      ack?.({ ok: false, error: "Missing callSessionId or gameType" });
      return;
    }
    const validTypes: GameType[] = ["ludo", "chess", "carrom", "sudoku"];
    if (!validTypes.includes(payload.gameType)) {
      ack?.({ ok: false, error: "Unsupported game type" });
      return;
    }
    const sessionId = randomUUID();
    const session: GameSession = {
      id: sessionId,
      callSessionId: payload.callSessionId,
      gameType: payload.gameType,
      status: "CREATED",
      players: [{ userId, seat: "player1", joinedAt: new Date().toISOString() }],
      moves: [],
      state: initGameState(payload.gameType),
      createdAt: new Date().toISOString(),
    };
    activeSessions.set(sessionId, session);
    sessionsCreated += 1;
    socket.join(`game:${sessionId}`);
    ack?.({ ok: true, sessionId });
  });

  socket.on("game.join", (payload: { sessionId: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
    if (!payload?.sessionId) { ack?.({ ok: false, error: "Missing sessionId" }); return; }
    const session = activeSessions.get(payload.sessionId);
    if (!session) { ack?.({ ok: false, error: "Session not found" }); return; }
    if (session.players.find(p => p.userId === userId)) { ack?.({ ok: false, error: "Already joined" }); return; }
    if (session.players.length >= 2) { ack?.({ ok: false, error: "Game full" }); return; }
    session.players.push({ userId, seat: "player2", joinedAt: new Date().toISOString() });
    socket.join(`game:${payload.sessionId}`);
    io.to(`game:${payload.sessionId}`).emit("game.player.joined", { userId, sessionId: payload.sessionId });
    if (session.players.length >= 2) {
      session.status = "ACTIVE";
      session.startedAt = new Date().toISOString();
      io.to(`game:${payload.sessionId}`).emit("game.started", { sessionId: payload.sessionId, state: session.state });
    }
    ack?.({ ok: true });
  });

  socket.on("game.move", (payload: { sessionId: string; move: unknown }, ack?: (r: { ok: boolean; seq?: number; error?: string }) => void) => {
    if (!payload?.sessionId) { ack?.({ ok: false, error: "Missing sessionId" }); return; }
    const session = activeSessions.get(payload.sessionId);
    if (!session) { ack?.({ ok: false, error: "Session not found" }); return; }
    const validation = validateMove(session, userId, payload.move);
    if (!validation.valid) { ack?.({ ok: false, error: validation.error }); return; }
    const seq = session.moves.length + 1;
    session.moves.push({ seq, userId, payload: payload.move, at: new Date().toISOString() });
    movesProcessed += 1;
    io.to(`game:${payload.sessionId}`).emit("game.move.broadcast", {
      sessionId: payload.sessionId, seq, userId, move: payload.move,
    });
    ack?.({ ok: true, seq });
  });

  socket.on("game.end", (payload: { sessionId: string; winnerId?: string; reason?: string }, ack?: (r: { ok: boolean }) => void) => {
    if (!payload?.sessionId) { ack?.({ ok: false }); return; }
    const session = activeSessions.get(payload.sessionId);
    if (!session) { ack?.({ ok: false }); return; }
    session.status = "ENDED";
    session.endedAt = new Date().toISOString();
    session.winnerId = payload.winnerId;
    sessionsEnded += 1;
    io.to(`game:${payload.sessionId}`).emit("game.ended", {
      sessionId: payload.sessionId,
      winnerId: payload.winnerId,
      reason: payload.reason ?? "normal",
      totalMoves: session.moves.length,
    });
    activeSessions.delete(payload.sessionId);
    ack?.({ ok: true });
  });

  socket.on("game.state", (payload: { sessionId: string }, ack?: (r: { ok: boolean; state?: unknown }) => void) => {
    if (!payload?.sessionId) { ack?.({ ok: false }); return; }
    const session = activeSessions.get(payload.sessionId);
    if (!session) { ack?.({ ok: false }); return; }
    ack?.({ ok: true, state: { ...session, moves: session.moves.slice(-20) } });
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
