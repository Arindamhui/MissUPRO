import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { WalletService } from "../wallet/wallet.service";
import { PaymentService } from "../payments/payment.service";

@Injectable()
export class ReconciliationJobsService {
  private readonly logger = new Logger(ReconciliationJobsService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Nightly wallet reconciliation job.
   *
   * Compares wallet coin balances against the sum of coin_transactions and logs mismatches.
   * This is the implementation of the `wallet.reconciliation.cron` requirement in plan.md.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runWalletReconciliationCron() {
    try {
      const result = await this.walletService.listLedgerMismatches(500);
      const mismatchCount = result.items.length;
      if (mismatchCount > 0) {
        this.logger.warn(
          `Wallet reconciliation found ${mismatchCount} mismatches (showing first 5): ` +
            JSON.stringify(result.items.slice(0, 5)),
        );
      } else {
        this.logger.log("Wallet reconciliation: no mismatches detected");
      }
    } catch (error) {
      this.logger.error("Wallet reconciliation cron failed", error as Error);
    }
  }

  /**
   * Nightly payment reconciliation job.
   *
   * Ensures COMPLETED payments have corresponding PURCHASE coin_transactions and detects orphans.
   * This wires the existing admin reconciliation logic into a scheduled job per plan.md.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runPaymentReconciliationCron() {
    try {
      const result = await this.paymentService.runPaymentReconciliation(500);
      const missingCount = result.missingPaymentIds.length;
      const orphanCount = result.orphanPurchaseReferenceIds.length;

      if (missingCount > 0 || orphanCount > 0) {
        this.logger.warn(
          `Payment reconciliation anomalies — missing payments: ${missingCount}, orphan purchases: ${orphanCount}`,
        );
        if (missingCount > 0) {
          this.logger.warn(
            `Missing payment ids (first 10): ${result.missingPaymentIds.slice(0, 10).join(", ")}`,
          );
        }
        if (orphanCount > 0) {
          this.logger.warn(
            `Orphan purchase reference ids (first 10): ${result.orphanPurchaseReferenceIds
              .slice(0, 10)
              .join(", ")}`,
          );
        }
      } else {
        this.logger.log("Payment reconciliation: no anomalies detected");
      }
    } catch (error) {
      this.logger.error("Payment reconciliation cron failed", error as Error);
    }
  }
}

