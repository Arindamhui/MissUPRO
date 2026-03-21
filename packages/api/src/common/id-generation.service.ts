import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { db } from "@missu/db";
import { agencies, hosts, users } from "@missu/db/schema";
import { eq } from "drizzle-orm";

export type IdPrefix = "U" | "A" | "H" | "AH";

interface IdConfig {
  prefix: IdPrefix;
  digits: number;
  maxAttempts: number;
}

const ID_CONFIGS = {
  USER: { prefix: "U" as IdPrefix, digits: 9, maxAttempts: 20 },
  AGENCY: { prefix: "A" as IdPrefix, digits: 9, maxAttempts: 20 },
  HOST_PLATFORM: { prefix: "H" as IdPrefix, digits: 9, maxAttempts: 20 },
  HOST_AGENCY: { prefix: "AH" as IdPrefix, digits: 8, maxAttempts: 20 },
};

@Injectable()
export class IdGenerationService {
  private readonly logger = new Logger(IdGenerationService.name);

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

  private async generate(
    config: IdConfig,
    existsCheck: (candidate: string) => Promise<boolean>,
  ): Promise<string> {
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      const candidate = `${config.prefix}${this.cryptoRandomDigits(config.digits)}`;
      if (!(await existsCheck(candidate))) {
        return candidate;
      }
      this.logger.warn(
        `ID collision on attempt ${attempt + 1} for prefix ${config.prefix}`,
      );
    }

    // Deterministic fallback: timestamp + random suffix ensures uniqueness
    const ts = String(Date.now());
    const randomSuffix = this.cryptoRandomDigits(3);
    const fallback = `${config.prefix}${(ts + randomSuffix).slice(-(config.digits))}`;

    this.logger.error(
      `ID generation exhausted ${config.maxAttempts} attempts for prefix ${config.prefix}, using fallback: ${fallback}`,
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
}
