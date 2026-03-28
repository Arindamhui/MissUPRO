import { Injectable, NestMiddleware, BadRequestException } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { ID_VALIDATORS, detectPanelIdType } from "./id-generation.service";

/**
 * Panel ID Validation Middleware
 *
 * Validates all incoming panel IDs in request params, query, and body.
 * Rejects any ID that:
 *   - Claims to be a panel ID but doesn't match strict format
 *   - Appears to be a tampered or manually injected ID
 *
 * Format Rules (STRICT):
 *   USER:         ^U\d{9}$
 *   ADMIN:        ^AD\d{8}$
 *   AGENCY:       ^A\d{9}$
 *   AGENCY HOST:  ^AH\d{8}$
 *   HOST:         ^H\d{9}$
 */

// Fields that may contain panel IDs
const PANEL_ID_FIELDS = new Map<string, keyof typeof ID_VALIDATORS>([
  // User IDs
  ["publicUserId", "USER"],
  ["publicId", "USER"], // can be overridden by context
  ["userPublicId", "USER"],
  // Admin IDs
  ["publicAdminId", "ADMIN"],
  ["adminPublicId", "ADMIN"],
  // Agency IDs
  ["agencyPublicId", "AGENCY"],
  ["agencyCode", "AGENCY"],
  // Host IDs — validated dynamically since H and AH share field names
  ["hostId", "HOST"],
]);

// Fields that can contain either HOST or AGENCY_HOST format
const DYNAMIC_HOST_FIELDS = new Set(["hostId", "hostPublicId"]);

function validateFieldValue(field: string, value: unknown): void {
  if (typeof value !== "string" || !value) return;

  // Check if this is a known panel ID field
  const expectedType = PANEL_ID_FIELDS.get(field);
  if (expectedType) {
    // For dynamic host fields, accept both H and AH formats
    if (DYNAMIC_HOST_FIELDS.has(field)) {
      const isValidHost = ID_VALIDATORS.HOST.test(value);
      const isValidAgencyHost = ID_VALIDATORS.AGENCY_HOST.test(value);
      if (!isValidHost && !isValidAgencyHost) {
        throw new BadRequestException(
          `Invalid ${field}: must match HOST (H + 9 digits) or AGENCY_HOST (AH + 8 digits) format`,
        );
      }
      return;
    }

    if (!ID_VALIDATORS[expectedType].test(value)) {
      throw new BadRequestException(
        `Invalid ${field}: must match ${expectedType} format (${ID_VALIDATORS[expectedType].source})`,
      );
    }
    return;
  }

  // Auto-detect: if the value looks like a panel ID prefix, validate its full format
  if (/^(U|AD|A|AH|H)\d/.test(value)) {
    const detected = detectPanelIdType(value);
    if (detected === null && value.length >= 9 && value.length <= 11) {
      // Looks like it could be a panel ID but doesn't match any format — suspicious
      throw new BadRequestException(
        `Invalid panel ID format: "${value}" does not match any known ID pattern`,
      );
    }
  }
}

function validateObject(obj: Record<string, unknown>): void {
  if (!obj || typeof obj !== "object") return;
  for (const [key, value] of Object.entries(obj)) {
    validateFieldValue(key, value);
  }
}

@Injectable()
export class IdValidationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Validate params (e.g., route params like :publicUserId)
    if (req.params) validateObject(req.params);

    // Validate query strings
    if (req.query) validateObject(req.query as Record<string, unknown>);

    // Validate body fields (POST/PUT/PATCH)
    if (req.body && typeof req.body === "object") validateObject(req.body);

    next();
  }
}
