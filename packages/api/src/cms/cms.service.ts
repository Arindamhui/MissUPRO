import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { banners, themes, themeAssets, promotions, homepageSections, levels, levelRewards } from "@missu/db/schema";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";

@Injectable()
export class CmsService {
  // ─── Banners ───
  async listBanners() {
    return db.select().from(banners).orderBy(asc(banners.position));
  }

  async createBanner(data: { title: string; imageUrl: string; linkType: string; linkTarget?: string; position?: number; startDate?: Date; endDate?: Date; createdByAdminId: string }) {
    const [banner] = await db.insert(banners).values({
      title: data.title,
      imageUrl: data.imageUrl,
      linkType: data.linkType as any,
      linkTarget: data.linkTarget,
      position: data.position ?? 0,
      status: "ACTIVE" as any,
      startDate: data.startDate,
      endDate: data.endDate,
      createdByAdminId: data.createdByAdminId,
    }).returning();
    return banner;
  }

  async updateBanner(bannerId: string, data: Record<string, any>) {
    const [updated] = await db.update(banners).set({ ...data, updatedAt: new Date() }).where(eq(banners.id, bannerId)).returning();
    return updated;
  }

  async deleteBanner(bannerId: string) {
    await db.delete(banners).where(eq(banners.id, bannerId));
    return { success: true };
  }

  // ─── Themes ───
  async listThemes() {
    return db.select().from(themes).orderBy(asc(themes.name));
  }

  async createTheme(data: {
    name: string; description: string;
    primaryColor: string; secondaryColor: string;
    backgroundColor: string; cardBackgroundColor: string;
    textPrimaryColor: string; textSecondaryColor: string;
    accentGradientStart: string; accentGradientEnd: string;
    createdByAdminId: string;
  }) {
    const [theme] = await db.insert(themes).values(data as any).returning();
    return theme;
  }

  async updateTheme(themeId: string, data: Record<string, any>) {
    const [updated] = await db.update(themes).set({ ...data, updatedAt: new Date() }).where(eq(themes.id, themeId)).returning();
    return updated;
  }

  async getThemeAssets(themeId: string) {
    return db.select().from(themeAssets).where(eq(themeAssets.themeId, themeId)).orderBy(asc(themeAssets.assetType));
  }

  async addThemeAsset(themeId: string, data: { assetType: string; storageKey: string; mimeType: string; sizeBytes: number }) {
    const [asset] = await db.insert(themeAssets).values({ themeId, ...data } as any).returning();
    return asset;
  }

  // ─── Promotions ───
  async listPromotions() {
    return db.select().from(promotions).orderBy(desc(promotions.createdAt));
  }

  async createPromotion(data: { name: string; description?: string; promotionType: string; startDate: Date; endDate: Date; targetAudience?: string; createdByAdminId: string; rewardRulesJson?: any }) {
    const [promo] = await db.insert(promotions).values({ ...data, status: "ACTIVE" as any } as any).returning();
    return promo;
  }

  async updatePromotion(promotionId: string, data: Record<string, any>) {
    const [updated] = await db.update(promotions).set({ ...data, updatedAt: new Date() }).where(eq(promotions.id, promotionId)).returning();
    return updated;
  }

  async getActivePromotions() {
    const now = new Date();
    return db
      .select()
      .from(promotions)
      .where(and(eq(promotions.status, "ACTIVE" as any), lte(promotions.startDate, now), gte(promotions.endDate, now)))
      .orderBy(desc(promotions.createdAt));
  }

  // ─── Levels CRUD ───
  async listLevels() {
    return db.select().from(levels).orderBy(asc(levels.levelNumber));
  }

  async createLevel(data: { levelNumber: number; levelName: string; levelTrack: string; thresholdValue: number; iconUrl?: string; createdByAdminId: string }) {
    const [level] = await db.insert(levels).values(data as any).returning();
    return level;
  }

  async updateLevel(levelId: string, data: Record<string, any>) {
    const [updated] = await db.update(levels).set({ ...data, updatedAt: new Date() }).where(eq(levels.id, levelId)).returning();
    return updated;
  }

  async getLevelRewards(levelId: string) {
    return db.select().from(levelRewards).where(eq(levelRewards.levelId, levelId));
  }

  async addLevelReward(levelId: string, data: { rewardType: string; rewardValue: string; rewardName: string; description: string }) {
    const [reward] = await db.insert(levelRewards).values({ levelId, ...data } as any).returning();
    return reward;
  }

  // ─── Homepage Sections ───
  async listHomepageSections() {
    return db.select().from(homepageSections).orderBy(asc(homepageSections.position));
  }

  async upsertHomepageSection(data: { id?: string; sectionType: string; position: number; configJson?: any; status?: string; createdByAdminId: string }) {
    if (data.id) {
      const [updated] = await db.update(homepageSections).set({
        sectionType: data.sectionType as any,
        position: data.position,
        configJson: data.configJson,
        status: data.status ?? "ACTIVE",
        updatedAt: new Date(),
      }).where(eq(homepageSections.id, data.id)).returning();
      return updated;
    }
    const [created] = await db.insert(homepageSections).values({
      sectionType: data.sectionType as any,
      position: data.position,
      configJson: data.configJson,
      status: data.status ?? "ACTIVE",
      createdByAdminId: data.createdByAdminId,
    }).returning();
    return created;
  }

  async deleteHomepageSection(sectionId: string) {
    await db.delete(homepageSections).where(eq(homepageSections.id, sectionId));
    return { success: true };
  }
}
