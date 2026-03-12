import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { games, gameSessions, gamePlayers, gameMoves, gameResults } from "@missu/db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";

@Injectable()
export class GameService {
  async startInCallGame(callSessionId: string, gameType: string, userId: string) {
    const [game] = await db.select().from(games).where(eq(games.gameType, gameType as any)).limit(1);
    if (!game || !game.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Game not available" });

    const [session] = await db.insert(gameSessions).values({
      callSessionId,
      gameType: gameType as any,
      status: "CREATED" as any,
      stateJson: {},
    }).returning();

    // Add the creating user as the first player
    await db.insert(gamePlayers).values({
      gameSessionId: session.id,
      userId,
      roleOrSeat: "PLAYER_1",
    });

    return session;
  }

  async submitMove(sessionId: string, userId: string, moveData: unknown) {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
    if (!session || session.status !== "ACTIVE") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Game session not active" });
    }

    const lastMove = await db.select().from(gameMoves)
      .where(eq(gameMoves.gameSessionId, sessionId))
      .orderBy(desc(gameMoves.moveSequence))
      .limit(1);

    const moveSequence = (lastMove[0]?.moveSequence ?? 0) + 1;
    const movePayloadJson = moveData as any;
    const moveHash = createHash("sha256").update(JSON.stringify(movePayloadJson) + moveSequence).digest("hex");

    const [move] = await db.insert(gameMoves).values({
      gameSessionId: sessionId,
      actorUserId: userId,
      moveSequence,
      movePayloadJson,
      moveHash,
    }).returning();
    return move;
  }

  async getGameState(sessionId: string) {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
    const players = await db.select().from(gamePlayers).where(eq(gamePlayers.gameSessionId, sessionId));
    const moves = await db.select().from(gameMoves).where(eq(gameMoves.gameSessionId, sessionId));
    return { session, players, moves };
  }

  async endSession(sessionId: string, winnerUserId?: string, durationSeconds = 0) {
    await db.update(gameSessions).set({
      status: "ENDED" as any,
      endedAt: new Date(),
    }).where(eq(gameSessions.id, sessionId));

    await db.insert(gameResults).values({
      gameSessionId: sessionId,
      winnerUserId: winnerUserId ?? null,
      resultType: winnerUserId ? "WIN" as any : "DRAW" as any,
      durationSeconds,
    });

    return { success: true };
  }
}
