import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@missu/db";
import {
  systemSettings,
  featureFlags,
  uiLayouts,
  uiComponents,
  componentPositions,
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
  userId?: string;
  platform?: "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS";
  appVersion?: string;
};

type CreatorEconomyPolicy = {
  coinsPerUsd: number;
  coinPriceUsd: number;
  diamondConversion: {
    coins: number;
    diamonds: number;
  };
  diamondValueUsdPer100: number;
  withdrawLimits: {
    minUsd: number;
    maxUsd: number | null;
  };
  commission: {
    platformCommissionPercent: number;
    creatorSharePercent: number;
    agencySharePercent: number;
    referralRewardPercent: number;
  };
};

@Injectable()
export class ConfigService {
  private now() {
    return new Date();
  }

  private resolveEnvironment(environment?: string) {
    return environment ?? process.env.NODE_ENV ?? "development";
  }

  private getFallbackUiLayout(layoutKey: string) {
    if (layoutKey === "tab_navigation") {
      return {
        source: "fallback",
        layout: {
          layoutKey,
          layoutName: "Default Mobile Tabs",
          screenKey: "tabs",
          platform: "MOBILE",
          status: "PUBLISHED",
          metadataJson: { dynamic: true },
        },
        tabNavigation: [
          { route: "index", label: "Home", icon: "🏠", order: 0, visible: true },
          { route: "discover", label: "Discover", icon: "🔍", order: 1, visible: true },
          { route: "live", label: "Live", icon: "📺", order: 2, visible: true },
          { route: "messages", label: "Messages", icon: "💬", order: 3, visible: true },
          { route: "me", label: "Me", icon: "👤", order: 4, visible: true },
        ],
        sections: {},
        componentPositions: [],
      };
    }

    if (layoutKey === "home_feed") {
      return {
        source: "fallback",
        layout: {
          layoutKey,
          layoutName: "Default Home Feed",
          screenKey: "home",
          platform: "MOBILE",
          status: "PUBLISHED",
          metadataJson: { dynamic: true },
        },
        tabNavigation: [],
        sections: {
          hero: [
            {
              id: "hero-banner",
              sectionKey: "hero",
              slotKey: "primary",
              positionIndex: 0,
              component: {
                componentKey: "home_hero_banner",
                componentType: "BANNER",
                displayName: "Home Hero Banner",
                dataSourceKey: null,
                props: {
                  eyebrow: "Tonight",
                  title: "Live rooms, creators, and events tuned for retention.",
                  subtitle: "This layout is delivered by the config API and rendered dynamically in the mobile app.",
                  ctaLabel: "Open trending live",
                  ctaRoute: "/home/trending-live",
                },
              },
            },
          ],
          quick_actions: [
            {
              id: "quick-actions",
              sectionKey: "quick_actions",
              slotKey: "grid",
              positionIndex: 0,
              component: {
                componentKey: "home_quick_actions",
                componentType: "CTA",
                displayName: "Quick Action Buttons",
                dataSourceKey: null,
                props: {
                  style: "grid",
                  buttons: [
                    { label: "Trending Live", icon: "📺", route: "/home/trending-live" },
                    { label: "Recommended", icon: "✨", route: "/home/recommended-models" },
                    { label: "Wallet", icon: "🪙", route: "/wallet/purchase" },
                    { label: "Events", icon: "🎉", route: "/events" },
                  ],
                },
              },
            },
          ],
          feature_cards: [
            {
              id: "feature-cards",
              sectionKey: "feature_cards",
              slotKey: "stack",
              positionIndex: 0,
              component: {
                componentKey: "home_feature_cards",
                componentType: "CARD_LIST",
                displayName: "Feature Cards",
                dataSourceKey: null,
                props: {
                  title: "Feature Cards",
                  cards: [
                    { title: "Recommended Models", subtitle: "Open personalized creator picks", route: "/home/recommended-models", accent: "primary" },
                    { title: "Agency Dashboard", subtitle: "Review host performance and team health", route: "/agency/dashboard", accent: "success" },
                  ],
                },
              },
            },
          ],
          event_promotions: [
            {
              id: "event-promotions",
              sectionKey: "event_promotions",
              slotKey: "carousel",
              positionIndex: 0,
              component: {
                componentKey: "home_event_promotions",
                componentType: "CAROUSEL",
                displayName: "Event Promotions",
                dataSourceKey: null,
                props: {
                  title: "Event Promotions",
                  items: [
                    { title: "PK Finals Tonight", subtitle: "Top agencies go live at 10 PM", route: "/pk/battle" },
                    { title: "Diamond Rush Weekend", subtitle: "Extra rewards on featured gifts", route: "/live/gift-panel" },
                  ],
                },
              },
            },
          ],
        },
        componentPositions: [],
      };
    }

    return {
      source: "fallback",
      layout: {
        layoutKey,
        layoutName: layoutKey,
        screenKey: layoutKey,
        platform: "MOBILE",
        status: "PUBLISHED",
        metadataJson: {},
      },
      tabNavigation: [],
      sections: {},
      componentPositions: [],
    };
  }

  async getUILayout(input: ScopeInput & { layoutKey: string; platform?: "MOBILE" | "WEB" | "ALL" }) {
    const environment = this.resolveEnvironment(input.environment);
    const now = this.now();
    const platform = input.platform ?? "MOBILE";

    const layouts = await db
      .select()
      .from(uiLayouts)
      .where(
        and(
          eq(uiLayouts.layoutKey, input.layoutKey),
          eq(uiLayouts.environment, environment),
          eq(uiLayouts.status, "PUBLISHED"),
          or(eq(uiLayouts.platform, platform), eq(uiLayouts.platform, "ALL")),
          or(isNull(uiLayouts.effectiveFrom), lte(uiLayouts.effectiveFrom, now)),
          or(isNull(uiLayouts.effectiveTo), gte(uiLayouts.effectiveTo, now)),
        ),
      )
      .orderBy(desc(uiLayouts.version), desc(uiLayouts.updatedAt));

    const ranked = layouts.sort((left, right) => {
      const leftScore = (left.platform === platform ? 2 : 0) + (left.regionCode === input.regionCode ? 1 : 0);
      const rightScore = (right.platform === platform ? 2 : 0) + (right.regionCode === input.regionCode ? 1 : 0);
      return rightScore - leftScore;
    });

    const selectedLayout = ranked[0];
    if (!selectedLayout) {
      return this.getFallbackUiLayout(input.layoutKey);
    }

    const positions = await db
      .select()
      .from(componentPositions)
      .where(eq(componentPositions.layoutId, selectedLayout.id))
      .orderBy(asc(componentPositions.sectionKey), asc(componentPositions.positionIndex));

    const componentIds = [...new Set(positions.map((position) => position.componentId))];
    const components = componentIds.length > 0
      ? await db
        .select()
        .from(uiComponents)
        .where(and(inArray(uiComponents.id, componentIds), eq(uiComponents.status, "PUBLISHED")))
      : [];

    const componentMap = new Map(components.map((component) => [component.id, component]));
    const sections = positions.reduce<Record<string, any[]>>((accumulator, position) => {
      const component = componentMap.get(position.componentId);
      if (!component) {
        return accumulator;
      }
      const item = {
        id: position.id,
        sectionKey: position.sectionKey,
        slotKey: position.slotKey,
        breakpoint: position.breakpoint,
        positionIndex: position.positionIndex,
        visibilityRules: position.visibilityRulesJson ?? {},
        component: {
          id: component.id,
          componentKey: component.componentKey,
          componentType: component.componentType,
          displayName: component.displayName,
          dataSourceKey: component.dataSourceKey,
          props: {
            ...(component.propsJson as Record<string, unknown> | null ?? {}),
            ...(position.overridesJson as Record<string, unknown> | null ?? {}),
          },
        },
      };
      if (!accumulator[position.sectionKey]) {
        accumulator[position.sectionKey] = [];
      }
      const sectionItems = accumulator[position.sectionKey];
      if (sectionItems) {
        sectionItems.push(item);
      }
      return accumulator;
    }, {});

    return {
      source: "db",
      layout: selectedLayout,
      tabNavigation: Array.isArray(selectedLayout.tabNavigationJson) ? selectedLayout.tabNavigationJson : [],
      sections,
      componentPositions: positions,
    };
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

  async getCreatorEconomyPolicy(scope: ScopeInput = {}): Promise<CreatorEconomyPolicy> {
    const [conversionSetting, withdrawalSetting, commissionSetting] = await Promise.all([
      this.getSetting("economy", "conversion_profile", scope),
      this.getSetting("economy", "withdrawal_policy", scope),
      this.getSetting("commission", "revenue_share", scope),
    ]);

    const conversion = (conversionSetting?.valueJson as {
      coinsPerUsd?: number;
      coinsToDiamonds?: { coins?: number; diamonds?: number };
      diamondValueUsdPer100?: number;
    } | null) ?? {};
    const withdrawal = (withdrawalSetting?.valueJson as {
      minWithdrawalUsd?: number;
      maxWithdrawalUsd?: number | null;
    } | null) ?? {};
    const commission = (commissionSetting?.valueJson as {
      platformCommissionPercent?: number;
      giftHostSharePercent?: number;
      agencySharePercent?: number;
      referralRewardPercent?: number;
    } | null) ?? {};

    const coinsPerUsd = Math.max(1, Number(conversion.coinsPerUsd ?? 100));
    const diamondConversionCoins = Math.max(1, Number(conversion.coinsToDiamonds?.coins ?? 100));
    const diamondConversionDiamonds = Math.max(0, Number(conversion.coinsToDiamonds?.diamonds ?? 100));
    const creatorSharePercent = Math.max(0, Math.min(100, Number(commission.giftHostSharePercent ?? 35)));
    const platformCommissionPercent = Math.max(
      0,
      Math.min(100, Number(commission.platformCommissionPercent ?? (100 - creatorSharePercent))),
    );

    return {
      coinsPerUsd,
      coinPriceUsd: Number((1 / coinsPerUsd).toFixed(4)),
      diamondConversion: {
        coins: diamondConversionCoins,
        diamonds: diamondConversionDiamonds,
      },
      diamondValueUsdPer100: Number(Number(conversion.diamondValueUsdPer100 ?? 0.25).toFixed(4)),
      withdrawLimits: {
        minUsd: Number(withdrawal.minWithdrawalUsd ?? 50),
        maxUsd: withdrawal.maxWithdrawalUsd == null ? null : Number(withdrawal.maxWithdrawalUsd),
      },
      commission: {
        platformCommissionPercent,
        creatorSharePercent,
        agencySharePercent: Math.max(0, Math.min(100, Number(commission.agencySharePercent ?? 10))),
        referralRewardPercent: Math.max(0, Math.min(100, Number(commission.referralRewardPercent ?? 5))),
      },
    };
  }

  async getFeatureFlag(flagKey: string, scope: ScopeInput = {}) {
    const platform = scope.platform ?? "ALL";
    const rows = await db
      .select()
      .from(featureFlags)
      .where(
        and(
          eq(featureFlags.flagKey, flagKey),
          or(eq(featureFlags.platform, platform as any), eq(featureFlags.platform, "ALL")),
          scope.appVersion ? or(eq(featureFlags.appVersion, scope.appVersion), isNull(featureFlags.appVersion)) : undefined,
        ),
      )
      .orderBy(desc(featureFlags.platform), desc(featureFlags.appVersion), desc(featureFlags.updatedAt))
      .limit(5);

    const exact = rows.find((row) => row.platform === platform && row.appVersion === (scope.appVersion ?? null));
    if (exact) return exact;
    const versionAgnostic = rows.find((row) => row.platform === platform && row.appVersion == null);
    if (versionAgnostic) return versionAgnostic;
    const globalVersion = rows.find((row) => row.platform === "ALL" && row.appVersion === (scope.appVersion ?? null));
    if (globalVersion) return globalVersion;
    return rows.find((row) => row.platform === "ALL" && row.appVersion == null) ?? null;
  }

  private stablePercent(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash % 100;
  }

  async evaluateFeatureFlag(flagKey: string, scope: ScopeInput = {}) {
    const flag = await this.getFeatureFlag(flagKey, scope);
    if (!flag) return { key: flagKey, enabled: false, reason: "NOT_FOUND" as const };
    if (!flag.enabled) return { key: flagKey, enabled: false, reason: "DISABLED" as const };

    if (flag.flagType === "BOOLEAN") {
      return { key: flagKey, enabled: true, reason: "BOOLEAN_ENABLED" as const };
    }

    if (flag.flagType === "REGION") {
      const allowList = (flag.regionCodesJson as string[] | null) ?? [];
      const enabled = !!scope.regionCode && allowList.includes(scope.regionCode);
      return { key: flagKey, enabled, reason: enabled ? "REGION_MATCH" as const : "REGION_MISS" as const };
    }

    if (flag.flagType === "USER_LIST") {
      const allowList = (flag.userIdsJson as string[] | null) ?? [];
      const enabled = !!scope.userId && allowList.includes(scope.userId);
      return { key: flagKey, enabled, reason: enabled ? "USER_MATCH" as const : "USER_MISS" as const };
    }

    if (flag.flagType === "PERCENTAGE") {
      const percentage = Math.max(0, Math.min(100, Number(flag.percentageValue ?? 0)));
      const token = scope.userId ?? scope.regionCode ?? "global";
      const enabled = this.stablePercent(`${flagKey}:${token}`) < percentage;
      return { key: flagKey, enabled, reason: "PERCENTAGE" as const, percentage };
    }

    return { key: flagKey, enabled: false, reason: "UNSUPPORTED_FLAG_TYPE" as const };
  }

  async listFeatureFlags() {
    return db.select().from(featureFlags).orderBy(asc(featureFlags.featureName), asc(featureFlags.platform), asc(featureFlags.appVersion));
  }

  async getConfigBootstrap(scope: ScopeInput = {}) {
    const environment = this.resolveEnvironment(scope.environment);
    const now = this.now();

    const [settings, flags, creatorEconomy, pricing, catalog, coins, boardConfigs, evConfigs, tiers, refs, groupConfigs, partyConfigs] = await Promise.all([
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
      this.getCreatorEconomyPolicy({ ...scope, environment }),
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

    const [homeFeedLayout, tabNavigationLayout] = await Promise.all([
      this.getUILayout({ ...scope, environment, layoutKey: "home_feed", platform: "MOBILE" }),
      this.getUILayout({ ...scope, environment, layoutKey: "tab_navigation", platform: "MOBILE" }),
    ]);

    return {
      environment,
      generatedAt: now.toISOString(),
      systemSettings: settings,
      creatorEconomy,
      featureFlags: flags.filter((flag) => {
        const platform = scope.platform ?? "ALL";
        const platformMatch = flag.platform === "ALL" || flag.platform === platform;
        const versionMatch = !scope.appVersion || flag.appVersion == null || flag.appVersion === scope.appVersion;
        return platformMatch && versionMatch;
      }),
      uiLayouts: {
        homeFeed: homeFeedLayout,
        tabNavigation: tabNavigationLayout,
      },
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
