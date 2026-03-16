import "dotenv/config";
import { db } from "../index";
import {
  users,
  pricingRules,
  giftCatalog,
  featureFlags,
  systemSettings,
  coinPackages,
  gifts,
  leaderboardConfigs,
  eventConfigs,
  vipTiers,
  referralRules,
  groupAudioConfigs,
  partyRoomConfigs,
  uiLayouts,
  uiComponents,
  componentPositions,
  levels,
  levelRewards,
  badges,
} from "../schema";
import { and, asc, eq, sql } from "drizzle-orm";

async function run() {
  let [admin] = await db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt)).limit(1);

  if (!admin) {
    const userColumnsResult = await db.execute(sql`
      select column_name
      from information_schema.columns
      where table_name = 'users'
    `);
    const userColumns = new Set(
      (userColumnsResult.rows as Array<{ column_name?: string }>).map((row) => String(row.column_name ?? "")),
    );

    if (userColumns.has("display_name")) {
      await db.execute(sql`
        insert into users (
          email,
          email_verified,
          display_name,
          username,
          role,
          status,
          country,
          preferred_locale,
          preferred_timezone,
          is_verified,
          referral_code
        ) values (
          ${"seed-admin@missu.local"},
          ${true},
          ${"Seed Admin"},
          ${"seed_admin"},
          ${"ADMIN"},
          ${"ACTIVE"},
          ${"US"},
          ${"en"},
          ${"UTC"},
          ${true},
          ${"SEEDADMIN"}
        )
        on conflict (email) do nothing
      `);
    } else {
      await db.execute(sql`
        insert into users (
          email,
          username,
          password_hash,
          role,
          is_suspended,
          is_banned,
          email_verified_at
        ) values (
          ${"seed-admin@missu.local"},
          ${"seed_admin"},
          ${"seed-bootstrap"},
          ${"ADMIN"},
          ${false},
          ${false},
          now()
        )
        on conflict (email) do nothing
      `);
    }

    [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "seed-admin@missu.local"))
      .limit(1);

    if (!admin) {
      throw new Error("Unable to create seed admin user.");
    }

    console.log("Created seed admin user for creator economy bootstrap.");
  }

  const now = new Date();
  const environment = process.env.NODE_ENV ?? "development";

  const existingSettings = await db
    .select({ id: systemSettings.id, namespace: systemSettings.namespace, key: systemSettings.key, environment: systemSettings.environment })
    .from(systemSettings)
    .where(eq(systemSettings.environment, environment));
  const settingKeys = new Set(existingSettings.map((row) => `${row.namespace}:${row.key}:${row.environment}`));

  const creatorEconomySettings = [
    {
      namespace: "pricing.call",
      key: "rules",
      valueJson: {
        audioCoinsPerMin: 30,
        videoCoinsPerMin: 50,
        maxCoinsPerMin: 100,
        modelLevelMultiplierEnabled: true,
        minimumBalanceCoins: 100,
        lowBalanceWarningMultiplier: 2,
      },
      changeReason: "Seed default call monetization pricing rules",
    },
    {
      namespace: "economy",
      key: "conversion_profile",
      valueJson: {
        coinsPerUsd: 100,
        coinsToDiamonds: { coins: 100, diamonds: 100 },
        diamondValueUsdPer100: 0.25,
      },
      changeReason: "Seed default creator economy conversion profile",
    },
    {
      namespace: "economy",
      key: "withdrawal_policy",
      valueJson: {
        minWithdrawalUsd: 50,
        maxWithdrawalUsd: 1000,
      },
      changeReason: "Seed default withdrawal policy",
    },
    {
      namespace: "commission",
      key: "revenue_share",
      valueJson: {
        platformCommissionPercent: 65,
        callCommissionPercent: 65,
        giftHostSharePercent: 35,
        agencySharePercent: 10,
        referralRewardPercent: 5,
      },
      changeReason: "Seed default creator economy commission split",
    },
    {
      namespace: "pk",
      key: "battle_rules",
      valueJson: {
        enabled: true,
        battleDurationSeconds: 300,
        votingDurationSeconds: 30,
        minHostLevel: 1,
        maxConcurrentPerHost: 1,
        selfGiftBlocked: true,
        scoreMultiplierPercent: 100,
      },
      changeReason: "Seed default PK battle rules",
    },
    {
      namespace: "pk",
      key: "reward_system",
      valueJson: {
        enabled: true,
        winnerRewardCoins: 500,
        loserRewardCoins: 150,
        drawRewardCoins: 250,
      },
      changeReason: "Seed default PK battle reward system",
    },
    {
      namespace: "levels",
      key: "xp_rules",
      valueJson: {
        watchSecondsPerInterval: 60,
        watchXpPerInterval: 2,
        watchMinSeconds: 60,
        streamSecondsPerInterval: 60,
        streamXpPerInterval: 4,
        streamMinSeconds: 60,
        giftCoinsPerInterval: 10,
        giftXpPerInterval: 1,
      },
      changeReason: "Seed default user level XP accrual policy",
    },
  ];

  for (const setting of creatorEconomySettings) {
    const settingKey = `${setting.namespace}:${setting.key}:${environment}`;
    if (settingKeys.has(settingKey)) continue;

    await db.insert(systemSettings).values({
      namespace: setting.namespace,
      key: setting.key,
      valueJson: setting.valueJson,
      environment,
      version: 1,
      status: "PUBLISHED",
      effectiveFrom: now,
      changeReason: setting.changeReason,
      updatedByAdminId: admin.id,
    } as any);
  }

  const userLevelSeeds = [
    { levelNumber: 1, levelName: "Spark", thresholdValue: 0, iconUrl: "https://missu.local/levels/spark.png" },
    { levelNumber: 2, levelName: "Rising", thresholdValue: 120, iconUrl: "https://missu.local/levels/rising.png" },
    { levelNumber: 3, levelName: "Spotlight", thresholdValue: 280, iconUrl: "https://missu.local/levels/spotlight.png" },
    { levelNumber: 4, levelName: "Pulse", thresholdValue: 600, iconUrl: "https://missu.local/levels/pulse.png" },
    { levelNumber: 5, levelName: "Supernova", thresholdValue: 1200, iconUrl: "https://missu.local/levels/supernova.png" },
    { levelNumber: 6, levelName: "Legend", thresholdValue: 2400, iconUrl: "https://missu.local/levels/legend.png" },
  ];

  for (const levelSeed of userLevelSeeds) {
    await db.insert(levels).values({
      levelNumber: levelSeed.levelNumber,
      levelName: levelSeed.levelName,
      levelTrack: "USER",
      thresholdValue: levelSeed.thresholdValue,
      iconUrl: levelSeed.iconUrl,
      status: "ACTIVE",
      createdByAdminId: admin.id,
    } as any).onConflictDoNothing({ target: [levels.levelTrack, levels.levelNumber] });
  }

  const badgeSeeds = [
    {
      badgeKey: "spark_starter",
      name: "Spark Starter",
      description: "Unlocked for entering the XP track.",
      iconUrl: "https://missu.local/badges/spark-starter.png",
      category: "LEVEL",
    },
    {
      badgeKey: "spotlight_supporter",
      name: "Spotlight Supporter",
      description: "Unlocked by consistent live engagement.",
      iconUrl: "https://missu.local/badges/spotlight-supporter.png",
      category: "LEVEL",
    },
    {
      badgeKey: "supernova_elite",
      name: "Supernova Elite",
      description: "Unlocked by sustained gifting and watch time.",
      iconUrl: "https://missu.local/badges/supernova-elite.png",
      category: "LEVEL",
    },
    {
      badgeKey: "legend_crown",
      name: "Legend Crown",
      description: "Top-tier engagement across watch, gift, and stream activity.",
      iconUrl: "https://missu.local/badges/legend-crown.png",
      category: "LEVEL",
    },
  ];

  for (const badgeSeed of badgeSeeds) {
    await db.insert(badges).values(badgeSeed as any).onConflictDoNothing({ target: badges.badgeKey });
  }

  const seededUserLevels = await db.select().from(levels).where(eq(levels.levelTrack, "USER" as any)).orderBy(asc(levels.levelNumber));
  const seededRewards = await db.select().from(levelRewards);
  const seededRewardKeys = new Set(seededRewards.map((reward) => `${reward.levelId}:${reward.rewardType}:${reward.rewardValue}`));
  const userLevelByNumber = new Map(seededUserLevels.map((level) => [level.levelNumber, level]));
  const rewardSeeds = [
    { levelNumber: 1, rewardType: "BADGE", rewardValue: "spark_starter", rewardName: "Spark Starter Badge", description: "Starter badge shown on profile and leaderboards.", autoGrant: true },
    { levelNumber: 2, rewardType: "VISUAL_EFFECT", rewardValue: "ember_trail", rewardName: "Ember Trail", description: "Subtle profile aura and gift send accent.", autoGrant: false },
    { levelNumber: 2, rewardType: "RANKING_BENEFIT", rewardValue: "discovery_boost_2", rewardName: "Discovery Boost +2%", description: "Minor ranking boost in engagement-driven placements.", autoGrant: false },
    { levelNumber: 3, rewardType: "BADGE", rewardValue: "spotlight_supporter", rewardName: "Spotlight Supporter Badge", description: "Badge for active supporters and stream regulars.", autoGrant: true },
    { levelNumber: 4, rewardType: "VISUAL_EFFECT", rewardValue: "pulse_ring", rewardName: "Pulse Ring", description: "Animated pulse ring around profile and room chips.", autoGrant: false },
    { levelNumber: 4, rewardType: "RANKING_BENEFIT", rewardValue: "leaderboard_priority_5", rewardName: "Leaderboard Priority +5%", description: "Stronger weighting in supporter and fan rankings.", autoGrant: false },
    { levelNumber: 5, rewardType: "BADGE", rewardValue: "supernova_elite", rewardName: "Supernova Elite Badge", description: "Elite badge for heavy platform engagement.", autoGrant: true },
    { levelNumber: 5, rewardType: "VISUAL_EFFECT", rewardValue: "supernova_glow", rewardName: "Supernova Glow", description: "Premium glow treatment for profile and live presence.", autoGrant: false },
    { levelNumber: 6, rewardType: "BADGE", rewardValue: "legend_crown", rewardName: "Legend Crown Badge", description: "Highest-tier user engagement badge.", autoGrant: true },
    { levelNumber: 6, rewardType: "VISUAL_EFFECT", rewardValue: "legend_halo", rewardName: "Legend Halo", description: "Halo effect on avatar, room cards, and gift UI.", autoGrant: false },
    { levelNumber: 6, rewardType: "RANKING_BENEFIT", rewardValue: "leaderboard_priority_10", rewardName: "Leaderboard Priority +10%", description: "Top-tier ranking uplift across engagement leaderboards.", autoGrant: false },
  ];

  for (const rewardSeed of rewardSeeds) {
    const level = userLevelByNumber.get(rewardSeed.levelNumber);
    if (!level) continue;
    const rewardKey = `${level.id}:${rewardSeed.rewardType}:${rewardSeed.rewardValue}`;
    if (seededRewardKeys.has(rewardKey)) continue;

    await db.insert(levelRewards).values({
      levelId: level.id,
      rewardType: rewardSeed.rewardType,
      rewardValue: rewardSeed.rewardValue,
      rewardName: rewardSeed.rewardName,
      description: rewardSeed.description,
      autoGrant: rewardSeed.autoGrant,
      status: "ACTIVE",
    } as any);
  }

  const existingFlags = await db
    .select({ flagKey: featureFlags.flagKey, platform: featureFlags.platform, appVersion: featureFlags.appVersion })
    .from(featureFlags);
  const flagKeys = new Set(existingFlags.map((row) => `${row.flagKey}:${row.platform}:${row.appVersion ?? "*"}`));
  const seededFlags = [
    {
      flagKey: "gift_sending",
      featureName: "gift sending",
      description: "Enable creator gifting flows",
    },
    {
      flagKey: "withdrawals",
      featureName: "withdrawals",
      description: "Enable creator withdrawal requests",
    },
    {
      flagKey: "pk_battles",
      featureName: "PK battles",
      description: "Enable PK battle requests, gifting, and scoring",
    },
  ];

  for (const flag of seededFlags) {
    const flagScopeKey = `${flag.flagKey}:ALL:*`;
    if (flagKeys.has(flagScopeKey)) continue;

    await db.insert(featureFlags).values({
      flagKey: flag.flagKey,
      featureName: flag.featureName,
      flagType: "BOOLEAN",
      enabled: true,
      platform: "ALL",
      appVersion: null,
      description: flag.description,
      createdByAdminId: admin.id,
    } as any);
  }

  const existingCoinPackages = await db.select({ name: coinPackages.name }).from(coinPackages);
  const coinPackageNames = new Set(existingCoinPackages.map((row) => row.name));
  const defaultCoinPackages = [
    {
      name: "Starter Pack",
      coinAmount: 500,
      bonusCoins: 0,
      priceUsd: "4.99",
      appleProductId: "com.missu.coins.starter",
      googleProductId: "com.missu.coins.starter",
      isFeatured: false,
      displayOrder: 1,
    },
    {
      name: "Creator Pack",
      coinAmount: 1200,
      bonusCoins: 120,
      priceUsd: "9.99",
      appleProductId: "com.missu.coins.creator",
      googleProductId: "com.missu.coins.creator",
      isFeatured: true,
      displayOrder: 2,
    },
    {
      name: "Whale Pack",
      coinAmount: 2500,
      bonusCoins: 500,
      priceUsd: "19.99",
      appleProductId: "com.missu.coins.whale",
      googleProductId: "com.missu.coins.whale",
      isFeatured: false,
      displayOrder: 3,
    },
  ];

  for (const coinPackage of defaultCoinPackages) {
    if (coinPackageNames.has(coinPackage.name)) continue;

    await db.insert(coinPackages).values({
      ...coinPackage,
      currency: "USD",
      isActive: true,
      createdByAdminId: admin.id,
    } as any);
  }

  const existingGifts = await db.select({ giftCode: gifts.giftCode }).from(gifts);
  const giftCodes = new Set(existingGifts.map((row) => row.giftCode));
  const defaultGifts = [
    {
      giftCode: "ROSE",
      name: "Rose",
      iconUrl: "https://cdn.missu.app/gifts/rose.png",
      coinPrice: 10,
      diamondCredit: 4,
      effectTier: "STANDARD",
      category: "STANDARD",
      supportedContextsJson: ["LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "GROUP_AUDIO", "PARTY"],
      displayOrder: 1,
    },
    {
      giftCode: "CROWN",
      name: "Crown",
      iconUrl: "https://cdn.missu.app/gifts/crown.png",
      coinPrice: 100,
      diamondCredit: 35,
      effectTier: "PREMIUM",
      category: "PREMIUM",
      supportedContextsJson: ["LIVE_STREAM", "PK_BATTLE", "GROUP_AUDIO", "PARTY"],
      displayOrder: 2,
    },
    {
      giftCode: "CASTLE",
      name: "Castle",
      iconUrl: "https://cdn.missu.app/gifts/castle.png",
      coinPrice: 500,
      diamondCredit: 175,
      effectTier: "LEGENDARY",
      category: "EVENT",
      supportedContextsJson: ["LIVE_STREAM", "PK_BATTLE", "PARTY"],
      displayOrder: 3,
    },
  ];

  for (const gift of defaultGifts) {
    if (giftCodes.has(gift.giftCode)) continue;

    await db.insert(gifts).values({
      ...gift,
      isActive: true,
      createdByAdminId: admin.id,
    } as any);
  }

  await db.insert(pricingRules).values({
    ruleKey: "call.default_video_pricing",
    category: "calls",
    formulaJson: { formulaType: "FIXED", coinsPerMinute: 50 },
    constraintsJson: { min: 20, max: 200 },
    status: "PUBLISHED",
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: pricingRules.ruleKey });

  await db.insert(giftCatalog).values({
    catalogKey: "gift.rose",
    displayName: "Rose",
    coinPrice: 10,
    diamondCredit: 7,
    effectTier: "MICRO",
    animationConfigJson: { style: "default" },
    availabilityJson: { contexts: ["LIVE_STREAM", "VIDEO_CALL"] },
    isActive: true,
    displayOrder: 1,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: giftCatalog.catalogKey });

  await db.insert(leaderboardConfigs).values({
    configKey: "leaderboard.daily_gifters",
    leaderboardType: "DAILY",
    scoringMetric: "gift_coins_sent",
    refreshIntervalSeconds: 300,
    maxEntries: 100,
    rankingFormulaJson: { order: "desc" },
    status: "PUBLISHED",
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: leaderboardConfigs.configKey });

  await db.insert(eventConfigs).values({
    configKey: "event.weekend_festival",
    eventType: "FESTIVAL",
    configJson: { multiplier: 1.2, rewardPool: 50000 },
    status: "PUBLISHED",
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: eventConfigs.configKey });

  await db.insert(vipTiers).values({
    tierCode: "gold",
    displayName: "Gold",
    monthlyPriceUsd: "9.99",
    coinPrice: 900,
    perkJson: { adFree: true, badge: "gold", dailyBonusCoins: 30 },
    isActive: true,
    displayOrder: 1,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: vipTiers.tierCode });

  await db.insert(referralRules).values({
    ruleKey: "referral.default",
    qualificationJson: { inviteeMinSpendUsd: 5, inviteeActiveDays: 3 },
    inviterRewardJson: { coins: 200 },
    inviteeRewardJson: { coins: 100 },
    antiFraudJson: { maxRewardsPerDay: 10 },
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: referralRules.ruleKey });

  await db.insert(groupAudioConfigs).values({
    configKey: "group_audio.default",
    configJson: { maxSpeakers: 8, maxListeners: 200, allowHandRaise: true },
    status: "PUBLISHED",
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: groupAudioConfigs.configKey });

  await db.insert(partyRoomConfigs).values({
    configKey: "party.default",
    configJson: { maxSeats: 8, maxAudience: 300, defaultTheme: "classic" },
    status: "PUBLISHED",
    isActive: true,
    effectiveFrom: now,
    createdByAdminId: admin.id,
  }).onConflictDoNothing({ target: partyRoomConfigs.configKey });

  let [homeLayout] = await db
    .select()
    .from(uiLayouts)
    .where(and(eq(uiLayouts.layoutKey, "home_feed"), eq(uiLayouts.platform, "MOBILE"), eq(uiLayouts.environment, environment)))
    .limit(1);

  if (!homeLayout) {
    [homeLayout] = await db.insert(uiLayouts).values({
      layoutKey: "home_feed",
      layoutName: "Published Home Feed",
      screenKey: "home",
      platform: "MOBILE",
      environment,
      version: 1,
      status: "PUBLISHED",
      metadataJson: { seeded: true },
      publishedByAdminId: admin.id,
    } as any).returning();
  }

  let [tabLayout] = await db
    .select()
    .from(uiLayouts)
    .where(and(eq(uiLayouts.layoutKey, "tab_navigation"), eq(uiLayouts.platform, "MOBILE"), eq(uiLayouts.environment, environment)))
    .limit(1);

  if (!tabLayout) {
    [tabLayout] = await db.insert(uiLayouts).values({
      layoutKey: "tab_navigation",
      layoutName: "Published Tab Navigation",
      screenKey: "tabs",
      platform: "MOBILE",
      environment,
      version: 1,
      status: "PUBLISHED",
      tabNavigationJson: [
        { route: "index", label: "Home", icon: "🏠", order: 0, visible: true },
        { route: "discover", label: "Discover", icon: "🔍", order: 1, visible: true },
        { route: "live", label: "Live", icon: "📺", order: 2, visible: true },
        { route: "messages", label: "Messages", icon: "💬", order: 3, visible: true },
        { route: "me", label: "Me", icon: "👤", order: 4, visible: true },
      ],
      metadataJson: { seeded: true },
      publishedByAdminId: admin.id,
    } as any).returning();
  }

  const existingComponents = await db.select().from(uiComponents);
  const componentMap = new Map(existingComponents.map((component) => [component.componentKey, component]));
  const seededComponents = [
    {
      componentKey: "seeded_home_banner",
      componentType: "BANNER",
      displayName: "Seeded Home Banner",
      propsJson: {
        eyebrow: "Now live",
        title: "Published layouts are active",
        subtitle: "The app is now using seeded UI layout rows instead of fallback defaults.",
        ctaLabel: "Open wallet",
        ctaRoute: "/wallet",
      },
    },
    {
      componentKey: "seeded_home_tabs",
      componentType: "TABS",
      displayName: "Seeded Home Tabs",
      propsJson: {
        title: "Jump back in",
        tabs: [
          { label: "Gifts", route: "/gifts", badge: "Creators" },
          { label: "Wallet", route: "/wallet", badge: "Balance" },
          { label: "Events", route: "/events", badge: "Tonight" },
        ],
      },
    },
    {
      componentKey: "seeded_home_cards",
      componentType: "CARD_LIST",
      displayName: "Seeded Home Cards",
      propsJson: {
        title: "Operator curated modules",
        cards: [
          { title: "Creator Dashboard", subtitle: "Payouts, schedule and review state", route: "/creator-dashboard" },
          { title: "Referrals", subtitle: "Track invite rewards", route: "/referrals", accent: "success" },
        ],
      },
    },
    {
      componentKey: "seeded_home_action",
      componentType: "FLOATING_ACTION",
      displayName: "Seeded Floating Action",
      propsJson: { label: "Open Gifts", route: "/gifts", color: "#E17055" },
    },
  ];

  for (const component of seededComponents) {
    if (!componentMap.has(component.componentKey)) {
      const [created] = await db.insert(uiComponents).values({
        ...component,
        schemaVersion: 1,
        status: "PUBLISHED",
        createdByAdminId: admin.id,
        publishedByAdminId: admin.id,
        publishedAt: now,
      } as any).returning();
      componentMap.set(component.componentKey, created!);
    }
  }

  const existingPositions = await db
    .select()
    .from(componentPositions)
    .where(eq(componentPositions.layoutId, homeLayout!.id));

  if (existingPositions.length === 0) {
    await db.insert(componentPositions).values([
      { layoutId: homeLayout!.id, componentId: componentMap.get("seeded_home_banner")!.id, sectionKey: "hero", slotKey: "primary", positionIndex: 0 },
      { layoutId: homeLayout!.id, componentId: componentMap.get("seeded_home_tabs")!.id, sectionKey: "quick_actions", slotKey: "tabs", positionIndex: 0 },
      { layoutId: homeLayout!.id, componentId: componentMap.get("seeded_home_cards")!.id, sectionKey: "feature_cards", slotKey: "stack", positionIndex: 0 },
      { layoutId: homeLayout!.id, componentId: componentMap.get("seeded_home_action")!.id, sectionKey: "floating", slotKey: "action", positionIndex: 0 },
    ] as any);
  }

  console.log("Config engine seed completed.");
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
