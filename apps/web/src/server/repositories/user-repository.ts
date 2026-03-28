import { db, users, hosts, agencies } from "@missu/db";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { normalizeAuthEmail } from "../lib/auth-identity";

type DbClient = any;

const authUserColumns = {
  id: users.id,
  publicId: users.publicId,
  publicUserId: users.publicUserId,
  identityKey: users.identityKey,
  googleId: users.googleId,
  email: users.email,
  phone: users.phone,
  passwordHash: users.passwordHash,
  displayName: users.displayName,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  platformRole: users.platformRole,
  authRole: users.authRole,
  authProvider: users.authProvider,
  authMetadataJson: users.authMetadataJson,
  country: users.country,
  city: users.city,
  preferredLocale: users.preferredLocale,
  preferredTimezone: users.preferredTimezone,
  createdAt: users.createdAt,
};

export const userRepository = {
  async findByEmail(email: string, dbClient: DbClient = db) {
    const normalizedEmail = normalizeAuthEmail(email);
    const result = await dbClient
      .select(authUserColumns)
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    return result[0] ?? null;
  },

  async findByGoogleSub(googleSub: string, dbClient: DbClient = db) {
    const result = await dbClient
      .select(authUserColumns)
      .from(users)
      .where(eq(users.googleId, googleSub))
      .limit(1);

    return result[0] ?? null;
  },

  async findById(id: string, dbClient: DbClient = db) {
    const result = await dbClient.select(authUserColumns).from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  },

  async existsByPublicId(publicId: string, dbClient: DbClient = db) {
    const result = await dbClient.select({ id: users.id }).from(users).where(eq(users.publicId, publicId)).limit(1);
    return result.length > 0;
  },

  async existsByUsername(username: string, dbClient: DbClient = db) {
    const result = await dbClient.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    return result.length > 0;
  },

  async existsByReferralCode(referralCode: string, dbClient: DbClient = db) {
    const result = await dbClient.select({ id: users.id }).from(users).where(eq(users.referralCode, referralCode)).limit(1);
    return result.length > 0;
  },

  async create(values: typeof users.$inferInsert, dbClient: DbClient = db) {
    const result = await dbClient.insert(users).values(values).returning();
    return result[0] ?? null;
  },

  async update(id: string, values: Partial<typeof users.$inferInsert>, dbClient: DbClient = db) {
    const result = await dbClient.update(users).set({ ...values, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return result[0] ?? null;
  },

  async getProfileById(id: string) {
    const userResult = await db.select(authUserColumns).from(users).where(eq(users.id, id)).limit(1);
    const user = userResult[0] ?? null;
    const host = await db.query.hosts.findFirst({ where: and(eq(hosts.userId, id), isNull(hosts.rejectedAt)) });
    const agency = await db.query.agencies.findFirst({
      where: and(
        or(eq(agencies.ownerId, id), eq(agencies.userId, id)),
        isNull(agencies.deletedAt),
      ),
    });

    return { user, host, agency };
  },

  async list(limit: number, offset: number) {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  },

  async count() {
    const result = await db.select({ total: count() }).from(users);
    return result[0]?.total ?? 0;
  },
};