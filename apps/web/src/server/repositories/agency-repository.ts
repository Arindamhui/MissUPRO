import { db, agencies, agencyRequests } from "@missu/db";
import { and, count, desc, eq, isNull } from "drizzle-orm";

type DbClient = any;

export const agencyRepository = {
  async existsByPublicId(publicId: string, dbClient: DbClient = db) {
    const result = await dbClient.select({ id: agencies.id }).from(agencies).where(eq(agencies.publicId, publicId)).limit(1);
    return result.length > 0;
  },

  async getByPublicId(publicId: string, dbClient: DbClient = db) {
    return dbClient.query.agencies.findFirst({ where: eq(agencies.publicId, publicId) });
  },

  async getByOwnerId(ownerId: string, dbClient: DbClient = db) {
    return dbClient.query.agencies.findFirst({ where: eq(agencies.ownerId, ownerId) });
  },

  async getById(id: string, dbClient: DbClient = db) {
    return dbClient.query.agencies.findFirst({ where: eq(agencies.id, id) });
  },

  async create(values: typeof agencies.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(agencies).values(values).returning();
    return result[0] ?? null;
  },

  async update(id: string, values: Partial<typeof agencies.$inferInsert>, dbClient: DbClient = db) {
    const result = await dbClient.update(agencies).set({ ...values, updatedAt: new Date() }).where(eq(agencies.id, id)).returning();
    return result[0] ?? null;
  },

  async createAgencyRequest(values: typeof agencyRequests.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(agencyRequests).values(values).returning();
    return result[0] ?? null;
  },

  async getAgencyRequest(id: string, dbClient: DbClient = db) {
    return dbClient.query.agencyRequests.findFirst({ where: eq(agencyRequests.id, id) });
  },

  async listAgencyRequests(agencyId: string, limit: number, offset: number) {
    return db
      .select()
      .from(agencyRequests)
      .where(and(eq(agencyRequests.agencyId, agencyId), isNull(agencyRequests.deletedAt)))
      .orderBy(desc(agencyRequests.createdAt))
      .limit(limit)
      .offset(offset);
  },

  async reviewAgencyRequest(id: string, approve: boolean, reviewerUserId: string, notes?: string, dbClient: DbClient = db) {
    const result = await dbClient
      .update(agencyRequests)
      .set({
        status: approve ? "APPROVED" : "REJECTED",
        notes,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agencyRequests.id, id))
      .returning();

    return result[0] ?? null;
  },

  async list(limit: number, offset: number) {
    return db.select().from(agencies).orderBy(desc(agencies.createdAt)).limit(limit).offset(offset);
  },

  async count() {
    const result = await db.select({ total: count() }).from(agencies);
    return result[0]?.total ?? 0;
  },

  async getDefaultAgency() {
    const approved = await db.select().from(agencies).where(eq(agencies.approvalStatus, "APPROVED")).orderBy(desc(agencies.createdAt));
    return approved.find((agency) => Boolean((agency.metadataJson as Record<string, unknown> | null)?.defaultForIndependentHosts)) ?? null;
  },
};