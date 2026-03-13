import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@missu/db";
import {
  systemSettings,
  featureFlags,
  pricingRules,
  giftCatalog,
  coinPackages,
  leaderboardConfigs,
  eventConfigs,
  vipTiers,
  referralRules,
  groupAudioConfigs,
  partyRoomConfigs,
} from "@missu/db/schema";

type ScopeInput = {
  environment?: string;
  regionCode?: string;
  segmentCode?: string;
};

@Injectable()
export class ConfigService {
  private now() {
    return new Date();
  }

  private resolveEnvironment(environment?: string) {
    return environment ?? process.env.NODE_ENV ?? "development";
  }

  async getSetting(namespace: string, key: string, scope: ScopeInput = {}) {
    const now = this.now();
    const environment = this.resolveEnvironment(scope.environment);

    const rows = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.namespace, namespace),
          eq(systemSettings.key, key),
          eq(systemSettings.environment, environment),
          eq(systemSettings.status, "PUBLISHED"),
          lte(systemSettings.effectiveFrom, now),
          or(isNull(systemSettings.effectiveTo), gte(systemSettings.effectiveTo, now)),
          scope.regionCode ? eq(systemSettings.regionCode, scope.regionCode) : undefined,
          scope.segmentCode ? eq(systemSettings.segmentCode, scope.segmentCode) : undefined,
        ),
      )
      .orderBy(desc(systemSettings.version), desc(systemSettings.updatedAt))
      .limit(1);

    return rows[0] ?? null;
  }

  async getFeatureFlag(flagKey: string) {
    const rows = await db.select().from(featureFlags).where(eq(featureFlags.flagKey, flagKey)).limit(1);
    return rows[0] ?? null;
  }

  async listFeatureFlags() {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.flagKey));
  }

  async getConfigBootstrap(scope: ScopeInput = {}) {
    const environment = this.resolveEnvironment(scope.environment);
    const now = this.now();

    const [settings, flags, pricing, catalog, coins, boardConfigs, evConfigs, tiers, refs, groupConfigs, partyConfigs] = await Promise.all([
      db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.environment, environment),
            eq(systemSettings.status, "PUBLISHED"),
            lte(systemSettings.effectiveFrom, now),
            or(isNull(systemSettings.effectiveTo), gte(systemSettings.effectiveTo, now)),
          ),
        ),
      this.listFeatureFlags(),
      db.select().from(pricingRules).where(eq(pricingRules.isActive, true)).orderBy(asc(pricingRules.ruleKey)),
      db.select().from(giftCatalog).where(eq(giftCatalog.isActive, true)).orderBy(asc(giftCatalog.displayOrder)),
      db.select().from(coinPackages).where(eq(coinPackages.isActive, true)).orderBy(asc(coinPackages.displayOrder)),
      db.select().from(leaderboardConfigs).where(eq(leaderboardConfigs.isActive, true)).orderBy(asc(leaderboardConfigs.configKey)),
      db.select().from(eventConfigs).where(eq(eventConfigs.isActive, true)).orderBy(asc(eventConfigs.configKey)),
      db.select().from(vipTiers).where(eq(vipTiers.isActive, true)).orderBy(asc(vipTiers.displayOrder)),
      db.select().from(referralRules).where(eq(referralRules.isActive, true)).orderBy(asc(referralRules.ruleKey)),
      db.select().from(groupAudioConfigs).where(eq(groupAudioConfigs.isActive, true)).orderBy(asc(groupAudioConfigs.configKey)),
      db.select().from(partyRoomConfigs).where(eq(partyRoomConfigs.isActive, true)).orderBy(asc(partyRoomConfigs.configKey)),
    ]);

    return {
      environment,
      generatedAt: now.toISOString(),
      systemSettings: settings,
      featureFlags: flags,
      pricingRules: pricing,
      giftCatalog: catalog,
      coinPackages: coins,
      leaderboardConfigs: boardConfigs,
      eventConfigs: evConfigs,
      vipTiers: tiers,
      referralRules: refs,
      groupAudioConfigs: groupConfigs,
      partyRoomConfigs: partyConfigs,
    };
  }

  async listCoinPackages() {
    return db.select().from(coinPackages).where(eq(coinPackages.isActive, true)).orderBy(asc(coinPackages.displayOrder));
  }

  async listGiftCatalog() {
    return db.select().from(giftCatalog).where(eq(giftCatalog.isActive, true)).orderBy(asc(giftCatalog.displayOrder));
  }

  async listPricingRules() {
    return db.select().from(pricingRules).where(eq(pricingRules.isActive, true)).orderBy(asc(pricingRules.ruleKey));
  }

  async listLeaderboardConfigs() {
    return db.select().from(leaderboardConfigs).where(eq(leaderboardConfigs.isActive, true)).orderBy(asc(leaderboardConfigs.configKey));
  }

  async listEventConfigs() {
    return db.select().from(eventConfigs).where(eq(eventConfigs.isActive, true)).orderBy(asc(eventConfigs.configKey));
  }

  async listVipTiers() {
    return db.select().from(vipTiers).where(eq(vipTiers.isActive, true)).orderBy(asc(vipTiers.displayOrder));
  }

  async listReferralRules() {
    return db.select().from(referralRules).where(eq(referralRules.isActive, true)).orderBy(asc(referralRules.ruleKey));
  }

  async listGroupAudioConfigs() {
    return db.select().from(groupAudioConfigs).where(eq(groupAudioConfigs.isActive, true)).orderBy(asc(groupAudioConfigs.configKey));
  }

  async listPartyRoomConfigs() {
    return db.select().from(partyRoomConfigs).where(eq(partyRoomConfigs.isActive, true)).orderBy(asc(partyRoomConfigs.configKey));
  }
}
