import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { GroupAudioService } from "./group-audio.service";
import { createGroupAudioRoomSchema } from "@missu/types";

@Injectable()
export class GroupAudioRouter {
  constructor(private readonly trpc: TrpcService, private readonly groupAudioService: GroupAudioService) {}

  get router() {
    return this.trpc.router({
      createRoom: this.trpc.protectedProcedure
        .input(createGroupAudioRoomSchema)
        .mutation(async ({ ctx, input }) => this.groupAudioService.createRoom(ctx.userId, input)),

      startRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.startRoom(input.roomId, ctx.userId)),

      joinRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.joinRoom(input.roomId, ctx.userId)),

      leaveRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.leaveRoom(input.roomId, ctx.userId)),

      endRoom: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.endRoom(input.roomId, ctx.userId)),

      getRoomState: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .query(async ({ input }) => this.groupAudioService.getRoomState(input.roomId)),

      listActiveRooms: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ input }) => this.groupAudioService.listActiveRooms(input.cursor, input.limit)),

      raiseHand: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.raiseHand(input.roomId, ctx.userId)),

      resolveHandRaise: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid(), action: z.enum(["accept", "reject"]) }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.resolveHandRaise(input.roomId, ctx.userId, input.userId, input.action)),

      promoteToSpeaker: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.promoteToSpeaker(input.roomId, ctx.userId, input.userId)),

      demoteToListener: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.demoteToListener(input.roomId, ctx.userId, input.userId)),

      muteParticipant: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.muteParticipant(input.roomId, ctx.userId, input.userId)),

      removeParticipant: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), userId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.removeParticipant(input.roomId, ctx.userId, input.userId)),

      updateTopic: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid(), topicTagsJson: z.any() }))
        .mutation(async ({ ctx, input }) => this.groupAudioService.updateTopic(input.roomId, ctx.userId, input.topicTagsJson)),

      getBillingState: this.trpc.protectedProcedure
        .input(z.object({ roomId: z.string().uuid() }))
        .query(async ({ ctx, input }) => this.groupAudioService.getBillingState(input.roomId, ctx.userId)),
    });
  }
}
