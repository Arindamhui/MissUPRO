import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { MediaService } from "./media.service";

@Injectable()
export class MediaRouter {
  constructor(private readonly trpc: TrpcService, private readonly mediaService: MediaService) {}

  get router() {
    return this.trpc.router({
      getSignedUrl: this.trpc.protectedProcedure
        .input(z.object({ assetId: z.string().uuid() }))
        .query(async ({ ctx, input }) => this.mediaService.getSignedUrl(input.assetId, ctx.userId)),

      deleteAsset: this.trpc.protectedProcedure
        .input(z.object({ assetId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => this.mediaService.deleteAsset(input.assetId, ctx.userId)),
    });
  }
}
