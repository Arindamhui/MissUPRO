import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { TrpcService } from "../trpc/trpc.service";
import { ConfigService } from "./config.service";

const scopeSchema = z.object({
  environment: z.string().optional(),
  regionCode: z.string().optional(),
  segmentCode: z.string().optional(),
});

@Injectable()
export class ConfigRouter {
  constructor(private readonly trpc: TrpcService, private readonly configService: ConfigService) {}

  get router() {
    return this.trpc.router({
      getBootstrap: this.trpc.procedure
        .input(scopeSchema.optional())
        .query(async ({ input }) => this.configService.getConfigBootstrap(input ?? {})),

      getSetting: this.trpc.procedure
        .input(scopeSchema.extend({ namespace: z.string().min(1), key: z.string().min(1) }))
        .query(async ({ input }) => this.configService.getSetting(input.namespace, input.key, input)),

      getFeatureFlag: this.trpc.procedure
        .input(z.object({ key: z.string().min(1) }))
        .query(async ({ input }) => this.configService.getFeatureFlag(input.key)),

      evaluateFeatureFlag: this.trpc.procedure
        .input(z.object({ key: z.string().min(1), userId: z.string().uuid().optional(), regionCode: z.string().optional() }))
        .query(async ({ input }) =>
          this.configService.evaluateFeatureFlag(input.key, { userId: input.userId, regionCode: input.regionCode }),
        ),

      listFeatureFlags: this.trpc.procedure
        .query(async () => this.configService.listFeatureFlags()),

      listPricingRules: this.trpc.procedure
        .query(async () => this.configService.listPricingRules()),

      listGiftCatalog: this.trpc.procedure
        .query(async () => this.configService.listGiftCatalog()),

      listCoinPackages: this.trpc.procedure
        .query(async () => this.configService.listCoinPackages()),

      listLeaderboardConfigs: this.trpc.procedure
        .query(async () => this.configService.listLeaderboardConfigs()),

      listEventConfigs: this.trpc.procedure
        .query(async () => this.configService.listEventConfigs()),

      listVipTiers: this.trpc.procedure
        .query(async () => this.configService.listVipTiers()),

      listReferralRules: this.trpc.procedure
        .query(async () => this.configService.listReferralRules()),

      listGroupAudioConfigs: this.trpc.procedure
        .query(async () => this.configService.listGroupAudioConfigs()),

      listPartyRoomConfigs: this.trpc.procedure
        .query(async () => this.configService.listPartyRoomConfigs()),
    });
  }
}
