import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { DiscoveryService } from "./discovery.service";
import { searchModelsSchema } from "@missu/types";

@Injectable()
export class DiscoveryRouter {
  constructor(private readonly trpc: TrpcService, private readonly discoveryService: DiscoveryService) {}

  get router() {
    return this.trpc.router({
      searchModels: this.trpc.protectedProcedure
        .input(searchModelsSchema)
        .query(async ({ input }) => {
          const { query, cursor, limit, ...filters } = input;
          return this.discoveryService.searchModels(query ?? "", filters, cursor, limit);
        }),

      getHomeFeed: this.trpc.protectedProcedure
        .query(async ({ ctx }) => this.discoveryService.getHomeFeed(ctx.userId)),

      getTrendingStreams: this.trpc.protectedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ input }) => this.discoveryService.getTrendingStreams(input.limit)),

      getModelRecommendations: this.trpc.protectedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ ctx, input }) =>
          this.discoveryService.getModelRecommendations(ctx.userId, input.limit),
        ),

      getOnlineModels: this.trpc.protectedProcedure
        .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
        .query(async ({ input }) => this.discoveryService.getOnlineModels(input.cursor, input.limit)),

      getModelCard: this.trpc.protectedProcedure
        .input(z.object({ modelId: z.string().uuid() }))
        .query(async ({ input }) => this.discoveryService.getModelCard(input.modelId)),
    });
  }
}
