import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { LiveService } from "./live.service";
import { requestPKBattleSchema, acceptPKBattleSchema } from "@missu/types";

const runtimeScopeSchema = z.object({
  platform: z.enum(["ALL", "MOBILE", "WEB", "ANDROID", "IOS"]).optional(),
  appVersion: z.string().optional(),
});

@Injectable()
export class LiveRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly liveService: LiveService,
  ) {}

  get router() {
    return this.trpc.router({
      getDiscoveryFeed: this.trpc.procedure
        .input(
          z.object({
            category: z.string().min(1).optional(),
            sort: z.enum(["trending", "viewers", "newest"]).default("trending"),
            limit: z.number().int().min(1).max(24).default(18),
          }),
        )
        .query(async ({ input }) => {
          return this.liveService.getDiscoveryFeed(input);
        }),

      getStreamPreview: this.trpc.procedure
        .input(z.object({ streamId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.liveService.getStreamPreview(input.streamId);
        }),

      getViewerRoom: this.trpc.procedure
        .input(z.object({ streamId: z.string().uuid() }).extend(runtimeScopeSchema.shape))
        .query(async ({ input }) => {
          return this.liveService.getViewerRoom(input.streamId, {
            platform: input.platform,
            appVersion: input.appVersion,
          });
        }),

      createRoom: this.trpc.protectedProcedure
        .input(z.object({ roomName: z.string().min(1), category: z.string().min(1), roomType: z.string().default("PUBLIC") }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.createRoom(ctx.userId, input.roomName, input.category, input.roomType);
        }),

      getMyActiveStream: this.trpc.protectedProcedure
        .query(async ({ ctx }) => {
          return this.liveService.getMyActiveStream(ctx.userId);
        }),

      startLiveSession: this.trpc.protectedProcedure
        .input(z.object({
          roomName: z.string().min(1),
          category: z.string().min(1),
          title: z.string().min(1),
          roomType: z.string().default("PUBLIC").optional(),
          streamType: z.string().default("SOLO").optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.startLiveSession(ctx.userId, input);
        }),

      startStream: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), title: z.string().min(1), streamType: z.string().default("SOLO") }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.startStream(input.roomId, ctx.userId, input.title, input.streamType);
        }),

      endStream: this.trpc.protectedProcedure
        .input(z.object({ streamId: z.string().uuid(), reason: z.string().optional() }))
        .mutation(async ({ input }) => {
          return this.liveService.endStream(input.streamId, input.reason);
        }),

      joinStream: this.trpc.protectedProcedure
        .input(z.object({ streamId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.joinStream(input.streamId, ctx.userId);
        }),

      leaveStream: this.trpc.protectedProcedure
        .input(z.object({ streamId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.leaveStream(input.streamId, ctx.userId);
        }),

      activeStreams: this.trpc.procedure
        .query(async () => this.liveService.getActiveStreams(50)),

      issueViewerToken: this.trpc.protectedProcedure
        .input(z.object({ streamId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.issueViewerToken(input.streamId, ctx.userId);
        }),

      issueHostToken: this.trpc.protectedProcedure
        .input(z.object({ streamId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.liveService.issueHostToken(input.streamId, ctx.userId);
        }),

      requestPKBattle: this.trpc.protectedProcedure
        .input(requestPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.liveService.requestPKBattle(ctx.userId, input.opponentHostId);
        }),

      acceptPKBattle: this.trpc.protectedProcedure
        .input(acceptPKBattleSchema)
        .mutation(async ({ ctx, input }) => {
          return this.liveService.acceptPKBattle(input.pkSessionId, ctx.userId);
        }),

      getPKBattleState: this.trpc.protectedProcedure
        .input(z.object({ pkSessionId: z.string().uuid() }))
        .query(async ({ input }) => {
          return this.liveService.getPKBattleState(input.pkSessionId);
        }),
    });
  }
}
