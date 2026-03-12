import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { campaigns, campaignParticipants } from "@missu/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

@Injectable()
export class CampaignService {
  async getActiveCampaigns() {
    const now = new Date();
    return db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, "ACTIVE"),
          lte(campaigns.startAt, now),
          gte(campaigns.endAt, now),
        ),
      )
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaignDetail(campaignId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) throw new Error("Campaign not found");

    const participants = await db
      .select()
      .from(campaignParticipants)
      .where(eq(campaignParticipants.campaignId, campaignId))
      .orderBy(desc(campaignParticipants.updatedAt));

    return { campaign, participants };
  }

  async joinCampaign(userId: string, campaignId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) throw new Error("Campaign not found");
    if (campaign.status !== "ACTIVE") throw new Error("Campaign is not active");

    const existing = await db
      .select()
      .from(campaignParticipants)
      .where(and(eq(campaignParticipants.campaignId, campaignId), eq(campaignParticipants.userId, userId)))
      .limit(1);

    if (existing[0]) throw new Error("Already joined this campaign");

    const [participant] = await db
      .insert(campaignParticipants)
      .values({ campaignId, userId, progressJson: {}, enrollmentStatus: "ENROLLED" })
      .returning();

    return participant;
  }

  async updateProgress(userId: string, campaignId: string, progressData: Record<string, unknown>) {
    const [participant] = await db
      .select()
      .from(campaignParticipants)
      .where(and(eq(campaignParticipants.campaignId, campaignId), eq(campaignParticipants.userId, userId)))
      .limit(1);

    if (!participant) throw new Error("Not a campaign participant");

    const currentProgress = (participant.progressJson as Record<string, unknown>) ?? {};
    const mergedProgress = { ...currentProgress, ...progressData };

    const [updated] = await db
      .update(campaignParticipants)
      .set({ progressJson: mergedProgress, updatedAt: new Date() })
      .where(eq(campaignParticipants.id, participant.id))
      .returning();

    return { participant: updated };
  }
}
