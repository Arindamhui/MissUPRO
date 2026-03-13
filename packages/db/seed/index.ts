import "dotenv/config";
import { db } from "../index";
import {
  users,
  pricingRules,
  giftCatalog,
  leaderboardConfigs,
  eventConfigs,
  vipTiers,
  referralRules,
  groupAudioConfigs,
  partyRoomConfigs,
} from "../schema";
import { asc } from "drizzle-orm";

async function run() {
  const [admin] = await db.select({ id: users.id }).from(users).orderBy(asc(users.createdAt)).limit(1);

  if (!admin) {
    console.warn("Seed skipped: no users exist yet for created_by_admin_id foreign keys.");
    return;
  }

  const now = new Date();

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

  console.log("Config engine seed completed.");
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
