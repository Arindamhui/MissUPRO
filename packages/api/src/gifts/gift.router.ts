import { Injectable } from "@nestjs/common";
import { TrpcService } from "../trpc/trpc.service";
import { GiftService } from "./gift.service";
import { sendGiftSchema, previewSendGiftSchema, getGiftLeaderboardSchema } from "@missu/types";

@Injectable()
export class GiftRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly giftService: GiftService,
  ) {}

  get router() {
    return this.trpc.router({
      getActiveCatalog: this.trpc.protectedProcedure
        .query(async () => this.giftService.getActiveCatalog()),

      previewSendGift: this.trpc.protectedProcedure
        .input(previewSendGiftSchema)
        .query(async ({ input }) => this.giftService.previewSendGift(input.giftId, input.quantity)),

      sendGift: this.trpc.protectedProcedure
        .input(sendGiftSchema)
        .mutation(async ({ ctx, input }) => {
          return this.giftService.sendGift(
            ctx.userId, input.giftId, input.receiverUserId,
            input.contextType, input.contextId, input.quantity, input.comboGroupId,
          );
        }),

      getGiftLeaderboard: this.trpc.protectedProcedure
        .input(getGiftLeaderboardSchema)
        .query(async ({ input }) => {
          return this.giftService.getGiftLeaderboard(input.contextType, input.contextId, input.limit);
        }),
    });
  }
}
