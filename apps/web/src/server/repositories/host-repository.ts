import { db, hostRequests, hosts } from "@missu/db";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";

type DbClient = any;

export const hostRepository = {
  async existsByPublicId(publicId: string, dbClient: DbClient = db) {
    const result = await dbClient.select({ id: hosts.id }).from(hosts).where(eq(hosts.publicId, publicId)).limit(1);
    return result.length > 0;
  },

  async create(values: typeof hosts.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(hosts).values(values).returning();
    return result[0] ?? null;
  },

  async getByUserId(userId: string, dbClient: DbClient = db) {
    return dbClient.query.hosts.findFirst({ where: eq(hosts.userId, userId) });
  },

  async createHostRequest(values: typeof hostRequests.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(hostRequests).values(values).returning();
    return result[0] ?? null;
  },

  async getHostRequest(id: string, dbClient: DbClient = db) {
    return dbClient.query.hostRequests.findFirst({ where: eq(hostRequests.id, id) });
  },

  async getById(id: string, dbClient: DbClient = db) {
    return dbClient.query.hosts.findFirst({ where: eq(hosts.id, id) });
  },

  async getLatestStatusByUserId(userId: string) {
    const host = await db.query.hosts.findFirst({ where: eq(hosts.userId, userId) });
    const request = await db.query.hostRequests.findFirst({ where: and(eq(hostRequests.userId, userId), isNull(hostRequests.deletedAt)) });
    return { host, request };
  },

  async reviewHostRequest(id: string, approve: boolean, reviewerUserId: string, notes?: string, dbClient: DbClient = db) {
    const result = await dbClient
      .update(hostRequests)
      .set({
        status: approve ? "APPROVED" : "REJECTED",
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .where(eq(hostRequests.id, id))
      .returning();

    return result[0] ?? null;
  },

  async list(limit: number, offset: number) {
    return db.select().from(hosts).orderBy(desc(hosts.createdAt)).limit(limit).offset(offset);
  },

  async listByAgency(agencyId: string, limit: number, offset: number) {
    return db.select().from(hosts).where(eq(hosts.agencyId, agencyId)).orderBy(desc(hosts.createdAt)).limit(limit).offset(offset);
  },

  async update(id: string, values: Partial<typeof hosts.$inferInsert>, dbClient: DbClient = db) {
    const result = await dbClient.update(hosts).set({ ...values, updatedAt: new Date() }).where(eq(hosts.id, id)).returning();
    return result[0] ?? null;
  },

  async listRequests(limit: number, offset: number) {
    return db.select().from(hostRequests).where(or(eq(hostRequests.status, "PENDING"), eq(hostRequests.status, "APPROVED"))).orderBy(desc(hostRequests.createdAt)).limit(limit).offset(offset);
  },

  async count() {
    const result = await db.select({ total: count() }).from(hosts);
    return result[0]?.total ?? 0;
  },
};