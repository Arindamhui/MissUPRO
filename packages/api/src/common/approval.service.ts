import { Injectable, Logger } from "@nestjs/common";
import { db } from "@missu/db";
import { adminLogs, admins } from "@missu/db/schema";
import { eq } from "drizzle-orm";

export type ApprovalAction = "approve" | "reject";

export interface ApprovalResult<T> {
  action: ApprovalAction;
  entity: T;
  reason?: string;
  adminUserId: string;
  timestamp: Date;
}

export interface AuditEntry {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  /**
   * Validate that an approval action is valid for the current entity status.
   */
  validateStatusTransition(
    currentStatus: string,
    action: ApprovalAction,
    allowedFromStatuses: string[] = ["PENDING"],
  ): void {
    const normalizedStatus = currentStatus.toUpperCase();
    if (!allowedFromStatuses.map((s) => s.toUpperCase()).includes(normalizedStatus)) {
      throw new Error(
        `Cannot ${action} entity with status '${currentStatus}'. Allowed statuses: ${allowedFromStatuses.join(", ")}`,
      );
    }
  }

  /**
   * Resolve the admin record ID from a user ID.
   * Required for proper foreign key relationships in admin_logs.
   */
  async resolveAdminRecordId(adminUserId: string): Promise<string | null> {
    const [adminRecord] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.userId, adminUserId))
      .limit(1);

    return adminRecord?.id ?? null;
  }

  /**
   * Log an admin action to the immutable audit trail.
   */
  async logAuditEntry(entry: AuditEntry): Promise<void> {
    try {
      const adminRecordId = await this.resolveAdminRecordId(entry.adminUserId);

      await db.insert(adminLogs).values({
        adminId: adminRecordId,
        action: this.mapAdminAction(entry.action),
        targetType: this.mapTargetType(entry.targetType),
        targetId: entry.targetId,
        beforeStateJson: entry.beforeState ?? null,
        afterStateJson: entry.afterState ?? null,
        reason: entry.reason ?? null,
        ipAddress: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      } as any);
    } catch (error) {
      // Audit logging must never break the primary operation
      this.logger.error(`Failed to write audit log: ${String(error)}`, {
        action: entry.action,
        targetId: entry.targetId,
      });
    }
  }

  private mapAdminAction(action: string): string {
    const actionMap: Record<string, string> = {
      "host.approve": "MODEL_APPROVE",
      "host.reject": "MODEL_REJECT",
      "host.suspend": "USER_SUSPEND",
      "host.reactivate": "USER_RESTORE",
      "agency.approve": "MODEL_APPROVE",
      "agency.reject": "MODEL_REJECT",
      "user.suspend": "USER_SUSPEND",
      "user.ban": "USER_BAN",
      "user.restore": "USER_RESTORE",
      "model.approve": "MODEL_APPROVE",
      "model.reject": "MODEL_REJECT",
      "withdrawal.approve": "WITHDRAWAL_APPROVE",
      "withdrawal.reject": "WITHDRAWAL_REJECT",
    };
    return actionMap[action] ?? "MANUAL_ADJUSTMENT";
  }

  private mapTargetType(target: string): string {
    const targetMap: Record<string, string> = {
      host: "MODEL",
      agency: "USER",
      user: "USER",
      model: "MODEL",
      withdrawal: "WITHDRAWAL",
      gift: "GIFT",
      payment: "PAYOUT",
    };
    return targetMap[target] ?? "USER";
  }
}
