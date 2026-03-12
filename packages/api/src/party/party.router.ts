import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { PartyService } from "./party.service";
import { createPartyRoomSchema, startActivitySchema } from "@missu/types";

@Injectable()
export class PartyRouter {
  constructor(private readonly trpc: TrpcService, private readonly partyService: PartyService) {}

  get router() {
    return this.trpc.router({
      // Room lifecycle
      createRoom: this.trpc.protectedProcedure
        .input(createPartyRoomSchema)
        .mutation(async ({ ctx, input }) => this.partyService.createRoom(ctx.userId, input)),

      joinRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.joinRoom(input.roomId, ctx.userId)),

      joinRoomWithPassword: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), password: z.string() }))
        .mutation(async ({ ctx, input }) => this.partyService.joinRoomWithPassword(input.roomId, ctx.userId, input.password)),

      leaveRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.leaveRoom(input.roomId, ctx.userId)),

      closeRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.closeRoom(input.roomId, ctx.userId)),

      pauseRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.pauseRoom(input.roomId, ctx.userId)),

      resumeRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.resumeRoom(input.roomId, ctx.userId)),

      getRoomState: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .query(async ({ input }) => this.partyService.getRoomState(input.roomId)),

      listActiveRooms: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ input }) => this.partyService.listActiveRooms(input.cursor, input.limit)),

      // Seat management
      claimSeat: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), seatNumber: z.number().int().min(1) }))
        .mutation(async ({ ctx, input }) => this.partyService.claimSeat(input.roomId, ctx.userId, input.seatNumber)),

      vacateSeat: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.vacateSeat(input.roomId, ctx.userId)),

      lockSeat: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), seatNumber: z.number().int().min(1) }))
        .mutation(async ({ ctx, input }) => this.partyService.lockSeat(input.roomId, ctx.userId, input.seatNumber)),

      reserveSeat: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), seatNumber: z.number().int().min(1), forUserId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.reserveSeat(input.roomId, ctx.userId, input.seatNumber, input.forUserId)),

      // Member management
      kickUser: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.kickUser(input.roomId, ctx.userId, input.userId)),

      muteSeat: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), seatNumber: z.number().int().min(1) }))
        .mutation(async ({ ctx, input }) => this.partyService.muteSeat(input.roomId, ctx.userId, input.seatNumber)),

      promoteToCoHost: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.promoteToCoHost(input.roomId, ctx.userId, input.userId)),

      // Theme
      updateTheme: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), themeId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.updateTheme(input.roomId, ctx.userId, input.themeId)),

      listAvailableThemes: this.trpc.protectedProcedure
        .query(async () => this.partyService.listAvailableThemes()),

      purchaseTheme: this.trpc.protectedProcedure
        .input(z.object({ themeId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.purchaseTheme(ctx.userId, input.themeId)),

      // Activities
      startActivity: this.trpc.protectedProcedure
        .input(startActivitySchema.extend({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.startActivity(input.roomId, ctx.userId, input.activityType, input.configJson)),

      joinActivity: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), activityId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.joinActivity(input.roomId, ctx.userId, input.activityId)),

      endActivity: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), activityId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.partyService.endActivity(input.roomId, ctx.userId, input.activityId)),

      getActivityState: this.trpc.protectedProcedure
        .input(z.object({ activityId: z.string().uuid() }))
        .query(async ({ input }) => this.partyService.getActivityState(input.activityId)),
    });
  }
}
