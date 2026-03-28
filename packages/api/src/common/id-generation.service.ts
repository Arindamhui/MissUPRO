import { randomBytes } from "node:crypto";
import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { db } from "@missu/db";
import { admins, agencies, hosts, users } from "@missu/db/schema";
import { eq } from "drizzle-orm";

// ─── Panel ID Prefixes ───
export type IdPrefix = "U" | "AD" | "A" | "AH" | "H";

// ─── Panel ID Types ───
export type PanelIdType = "USER" | "ADMIN" | "AGENCY" | "HOST_PLATFORM" | "HOST_AGENCY";

interface IdConfig {
  prefix: IdPrefix;
  digits: number;
  totalLength: number; // prefix.length + digits
  maxAttempts: number;
  regex: RegExp;
  label: string;
}

/**
 * STRICT ID FORMAT RULES — NO EXCEPTION
 *
 * USER:         U  + 9 digits  → U123456789    (total 10 chars)
 * ADMIN:        AD + 8 digits  → AD12345678    (total 10 chars)
 * AGENCY:       A  + 9 digits  → A123456789    (total 10 chars)
 * AGENCY HOST:  AH + 8 digits  → AH12345678    (total 10 chars)
 * HOST:         H  + 9 digits  → H123456789    (total 10 chars)
 */
const ID_CONFIGS: Record<PanelIdType, IdConfig> = {
  USER:          { prefix: "U",  digits: 9, totalLength: 10, maxAttempts: 30, regex: /^U\d{9}$/,  label: "User ID" },
  ADMIN:         { prefix: "AD", digits: 8, totalLength: 10, maxAttempts: 30, regex: /^AD\d{8}$/, label: "Admin ID" },
  AGENCY:        { prefix: "A",  digits: 9, totalLength: 10, maxAttempts: 30, regex: /^A\d{9}$/,  label: "Agency ID" },
  HOST_AGENCY:   { prefix: "AH", digits: 8, totalLength: 10, maxAttempts: 30, regex: /^AH\d{8}$/, label: "Agency Host ID" },
  HOST_PLATFORM: { prefix: "H",  digits: 9, totalLength: 10, maxAttempts: 30, regex: /^H\d{9}$/,  label: "Host ID" },
};

// ─── Validation Regexes (exported for use across the system) ───
export const ID_VALIDATORS = {
  USER:         /^U\d{9}$/,
  ADMIN:        /^AD\d{8}$/,
  AGENCY:       /^A\d{9}$/,
  AGENCY_HOST:  /^AH\d{8}$/,
  HOST:         /^H\d{9}$/,
} as const;

/**
 * Validate a panel ID against its expected format.
 * Returns true if valid, false if invalid.
 */
export function isValidPanelId(id: string, type: keyof typeof ID_VALIDATORS): boolean {
  return ID_VALIDATORS[type].test(id);
}

/**
 * Detect the panel type from an ID string.
 * Returns null if the ID doesn't match any known format.
 */
export function detectPanelIdType(id: string): keyof typeof ID_VALIDATORS | null {
  // Check multi-char prefixes first to avoid ambiguity (AD before A, AH before A)
  if (ID_VALIDATORS.ADMIN.test(id)) return "ADMIN";
  if (ID_VALIDATORS.AGENCY_HOST.test(id)) return "AGENCY_HOST";
  if (ID_VALIDATORS.USER.test(id)) return "USER";
  if (ID_VALIDATORS.AGENCY.test(id)) return "AGENCY";
  if (ID_VALIDATORS.HOST.test(id)) return "HOST";
  return null;
}

/**
 * Assert that a panel ID is valid. Throws BadRequestException if not.
 */
export function assertValidPanelId(id: string, type: keyof typeof ID_VALIDATORS): void {
  if (!isValidPanelId(id, type)) {
    throw new BadRequestException(
      `Invalid ${type} ID format. Expected: ${ID_VALIDATORS[type].source}`,
    );
  }
}

@Injectable()
export class IdGenerationService {
  private readonly logger = new Logger(IdGenerationService.name);

  // ─── Public Generation Methods ───

  async generateUserId(): Promise<string> {
    return this.generate(ID_CONFIGS.USER, async (candidate) => {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.publicUserId, candidate))
        .limit(1);
      return Boolean(existing);
    });
  }

  async generateAdminId(): Promise<string> {
    return this.generate(ID_CONFIGS.ADMIN, async (candidate) => {
      const [existing] = await db
        .select({ id: admins.id })
        .from(admins)
        .where(eq(admins.publicAdminId, candidate))
        .limit(1);
      return Boolean(existing);
    });
  }

  async generateAgencyCode(): Promise<string> {
    return this.generate(ID_CONFIGS.AGENCY, async (candidate) => {
      const [existing] = await db
        .select({ id: agencies.id })
        .from(agencies)
        .where(eq(agencies.publicId, candidate))
        .limit(1);
      return Boolean(existing);
    });
  }

  async generateHostId(type: "PLATFORM" | "AGENCY"): Promise<string> {
    const config = type === "AGENCY" ? ID_CONFIGS.HOST_AGENCY : ID_CONFIGS.HOST_PLATFORM;
    return this.generate(config, async (candidate) => {
      const [existing] = await db
        .select({ id: hosts.id })
        .from(hosts)
        .where(eq(hosts.hostId, candidate))
        .limit(1);
      return Boolean(existing);
    });
  }

  // ─── Validation Methods ───

  validateUserId(id: string): boolean { return ID_CONFIGS.USER.regex.test(id); }
  validateAdminId(id: string): boolean { return ID_CONFIGS.ADMIN.regex.test(id); }
  validateAgencyId(id: string): boolean { return ID_CONFIGS.AGENCY.regex.test(id); }
  validateAgencyHostId(id: string): boolean { return ID_CONFIGS.HOST_AGENCY.regex.test(id); }
  validateHostId(id: string): boolean { return ID_CONFIGS.HOST_PLATFORM.regex.test(id); }

  /**
   * Validate any panel ID by auto-detecting its type.
   */
  validateAnyPanelId(id: string): { valid: boolean; type: keyof typeof ID_VALIDATORS | null } {
    const type = detectPanelIdType(id);
    return { valid: type !== null, type };
  }

  // ─── Core Generation Engine ───

  private async generate(
    config: IdConfig,
    existsCheck: (candidate: string) => Promise<boolean>,
  ): Promise<string> {
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      const digits = this.cryptoRandomDigits(config.digits);
      const candidate = `${config.prefix}${digits}`;

      // Strict format self-check before DB query
      if (!config.regex.test(candidate)) {
        this.logger.error(`Generated ID failed self-validation: ${candidate}`);
        continue;
      }

      if (!(await existsCheck(candidate))) {
        return candidate;
      }

      this.logger.warn(
        `${config.label} collision on attempt ${attempt + 1}: ${candidate}`,
      );
    }

    // Fallback: crypto-random suffix mixed with timestamp fragment (unpredictable)
    const tsFrag = String(Date.now()).slice(-4);
    const randFrag = this.cryptoRandomDigits(config.digits);
    // XOR-mix timestamp fragment into random digits for unpredictability
    const mixed = this.mixDigits(randFrag, tsFrag);
    const fallback = `${config.prefix}${mixed.slice(0, config.digits)}`;

    if (!config.regex.test(fallback)) {
      // Should never happen, but safety net
      throw new Error(`ID generation engine failure for ${config.label}: fallback ${fallback} invalid`);
    }

    this.logger.error(
      `${config.label} exhausted ${config.maxAttempts} attempts, using fallback`,
    );

    return fallback;
  }

  /**
   * Generates cryptographically random decimal digits.
   * Uses rejection sampling from crypto.randomBytes to ensure uniform distribution.
   */
  private cryptoRandomDigits(length: number): string {
    let digits = "";
    while (digits.length < length) {
      const bytes = randomBytes(Math.max(length, 8));
      for (const byte of bytes) {
        // Rejection sampling: only accept bytes 0-249 to avoid modulo bias
        if (byte < 250 && digits.length < length) {
          digits += String(byte % 10);
        }
      }
    }
    return digits.slice(0, length);
  }

  /**
   * Mix two digit strings by XOR-adding each pair mod 10.
   * Ensures fallback IDs are not trivially predictable.
   */
  private mixDigits(a: string, b: string): string {
    let result = "";
    for (let i = 0; i < a.length; i++) {
      const da = Number(a[i]) || 0;
      const db = Number(b[i % b.length]) || 0;
      result += String((da + db) % 10);
    }
    return result;
  }
}
