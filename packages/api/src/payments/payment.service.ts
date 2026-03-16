import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { coinPackages, payments, webhookEvents, coinTransactions, paymentDisputes } from "@missu/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { decodeCursor, encodeCursor, generateIdempotencyKey } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";
import { IdempotencyService } from "../common/idempotency.service";

@Injectable()
export class PaymentService {
  constructor(
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async createPaymentIntent(userId: string, coinPackageId: string, provider: string, idempotencyKey?: string) {
    const [coinPackage] = await db
      .select()
      .from(coinPackages)
      .where(and(eq(coinPackages.id, coinPackageId), eq(coinPackages.isActive, true)))
      .limit(1);

    if (!coinPackage) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Coin package not found or inactive" });
    }

    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "payment_intent", `${provider}:${coinPackageId}`);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "payments:create-intent",
        actorUserId: userId,
        requestData: { coinPackageId, provider },
      },
      async () => {
        const [payment] = await db.insert(payments).values({
          userId,
          coinPackageId,
          provider: provider as any,
          status: "PENDING" as any,
          amountUsd: coinPackage.priceUsd,
          coinsCredited: coinPackage.coinAmount + coinPackage.bonusCoins,
          idempotencyKey: idemKey,
          metadataJson: {
            paymentIdempotencyKey: idemKey,
            coinPackageName: coinPackage.name,
            baseCoins: coinPackage.coinAmount,
            bonusCoins: coinPackage.bonusCoins,
          },
        }).returning();

        if (!payment) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payment intent" });
        }

        await db.update(payments)
          .set({
            metadataJson: { ...(payment.metadataJson as Record<string, unknown> | null), paymentId: payment.id },
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        return {
          paymentId: payment.id,
          provider: payment.provider,
          status: payment.status,
          amountUsd: payment.amountUsd,
          coinsCredited: payment.coinsCredited,
          providerMetadata: {
            paymentId: payment.id,
            userId,
            coinPackageId,
            idempotencyKey: idemKey,
          },
        };
      },
    );
  }

  private getProviderEventId(provider: string, parsed: any) {
    if (provider === "STRIPE") {
      return parsed.id ?? null;
    }

    if (provider === "RAZORPAY") {
      return parsed.payload?.payment?.entity?.id ?? parsed.id ?? parsed.event ?? null;
    }

    return parsed.id ?? parsed.event ?? parsed.event_id ?? null;
  }

  private getWebhookOutcome(provider: string, parsed: any) {
    if (provider === "STRIPE") {
      const eventType = parsed.type;
      const object = parsed.data?.object ?? {};
      const providerPaymentId = object.payment_intent ?? object.id ?? null;
      const metadataPaymentId = object.metadata?.paymentId ?? object.metadata?.payment_id ?? null;

      if (["payment_intent.succeeded", "checkout.session.completed"].includes(eventType)) {
        return { eventType, providerPaymentId, metadataPaymentId, status: "COMPLETED" as const };
      }

      if (["payment_intent.payment_failed", "checkout.session.expired"].includes(eventType)) {
        return {
          eventType,
          providerPaymentId,
          metadataPaymentId,
          status: "FAILED" as const,
          failureReason: object.last_payment_error?.message ?? `${eventType} received`,
        };
      }

      return { eventType, providerPaymentId, metadataPaymentId, status: null };
    }

    if (provider === "RAZORPAY") {
      const eventType = parsed.event;
      const entity = parsed.payload?.payment?.entity ?? {};
      const providerPaymentId = entity.order_id ?? entity.id ?? null;
      const providerTransactionId = entity.id ?? null;
      const metadataPaymentId = entity.notes?.paymentId ?? entity.notes?.payment_id ?? null;

      if (eventType === "payment.captured") {
        return { eventType, providerPaymentId, providerTransactionId, metadataPaymentId, status: "COMPLETED" as const };
      }

      if (eventType === "payment.failed") {
        return {
          eventType,
          providerPaymentId,
          providerTransactionId,
          metadataPaymentId,
          status: "FAILED" as const,
          failureReason: entity.error_description ?? "Razorpay payment failed",
        };
      }

      return { eventType, providerPaymentId, providerTransactionId, metadataPaymentId, status: null };
    }

    return { eventType: parsed.type ?? parsed.event ?? "unknown", providerPaymentId: null, metadataPaymentId: null, status: null };
  }

  async verifyWebhookEvent(provider: string, payload: string, signature: string) {
    const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    const razorpaySecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    let isValid = false;

    if (provider === "STRIPE") {
      const parts = signature.split(",").map((part) => part.trim());
      const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
      const sig = parts.find((part) => part.startsWith("v1="))?.slice(3);
      if (!timestamp || !sig || !stripeSecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Stripe webhook signature header" });
      }
      const expectedSig = createHmac("sha256", stripeSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");

      const incoming = Buffer.from(sig, "utf8");
      const expected = Buffer.from(expectedSig, "utf8");
      isValid = incoming.length === expected.length && timingSafeEqual(incoming, expected);
    } else if (provider === "RAZORPAY") {
      if (!razorpaySecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Razorpay webhook secret is not configured" });
      }
      const expectedSig = createHmac("sha256", razorpaySecret)
        .update(payload)
        .digest("hex");
      const incoming = Buffer.from(signature, "utf8");
      const expected = Buffer.from(expectedSig, "utf8");
      isValid = incoming.length === expected.length && timingSafeEqual(incoming, expected);
    }

    if (!isValid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid webhook signature" });
    }

    const parsed = JSON.parse(payload);
    const providerEventId = this.getProviderEventId(provider, parsed);
    if (!providerEventId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Webhook payload missing event id" });
    }

    const webhookOutcome = this.getWebhookOutcome(provider, parsed);

    const [existingEvent] = await db
      .select()
      .from(webhookEvents)
      .where(and(eq(webhookEvents.provider, provider as any), eq(webhookEvents.providerEventId, providerEventId)))
      .limit(1);

    if (existingEvent?.providerEventId === providerEventId) {
      return { verified: true, replay: true, processingStatus: existingEvent?.processingStatus ?? null };
    }

    const payloadHash = createHmac("sha256", "webhook").update(payload).digest("hex");

    const [storedEvent] = await db.insert(webhookEvents).values({
      provider: provider as any,
      providerEventId,
      signatureValid: true,
      payloadHash,
      receivedAt: new Date(),
      processingStatus: "PENDING" as any,
    }).onConflictDoNothing().returning();

    if (!storedEvent) {
      const [raceEvent] = await db
        .select()
        .from(webhookEvents)
        .where(and(eq(webhookEvents.provider, provider as any), eq(webhookEvents.providerEventId, providerEventId)))
        .limit(1);

      return { verified: true, replay: true, processingStatus: raceEvent?.processingStatus ?? "PENDING" };
    }

    let paymentRecord: typeof payments.$inferSelect | null = null;

    if (webhookOutcome.metadataPaymentId) {
      const [paymentById] = await db.select().from(payments).where(eq(payments.id, webhookOutcome.metadataPaymentId)).limit(1);
      paymentRecord = paymentById ?? null;
    }

    if (!paymentRecord && webhookOutcome.providerPaymentId) {
      const [paymentByProviderId] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.provider, provider as any), eq(payments.providerPaymentId, webhookOutcome.providerPaymentId)))
        .limit(1);
      paymentRecord = paymentByProviderId ?? null;
    }

    if (paymentRecord && webhookOutcome.status === "COMPLETED" && paymentRecord.status !== "COMPLETED") {
      await this.walletService.creditCoins(
        paymentRecord.userId,
        paymentRecord.coinsCredited,
        "PURCHASE",
        paymentRecord.id,
        `Coin purchase: ${paymentRecord.coinsCredited} coins`,
        generateIdempotencyKey(paymentRecord.userId, "payment_credit", paymentRecord.id),
      );
    }

    if (paymentRecord) {
      await db
        .update(payments)
        .set({
          providerPaymentId: webhookOutcome.providerPaymentId ?? paymentRecord.providerPaymentId,
          providerTransactionId: (webhookOutcome as any).providerTransactionId ?? paymentRecord.providerTransactionId,
          status: (webhookOutcome.status ?? paymentRecord.status) as any,
          failureReason: webhookOutcome.failureReason ?? paymentRecord.failureReason,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentRecord.id));
    }

    await db
      .update(webhookEvents)
      .set({
        processedAt: new Date(),
        processingStatus: webhookOutcome.status ?? "IGNORED",
        failureReason: webhookOutcome.failureReason ?? null,
      })
      .where(eq(webhookEvents.id, storedEvent.id));

    return {
      verified: true,
      processingStatus: webhookOutcome.status ?? "IGNORED",
      paymentId: paymentRecord?.id ?? null,
    };
  }

  async getPaymentDetail(paymentId: string) {
    const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    return p ?? null;
  }

  async listWebhookEvents(cursor?: string, limit = 50) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const rows = await db
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = rows.length > limit;
    return {
      items: hasMore ? rows.slice(0, limit) : rows,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async listPaymentDisputes(cursor?: string, limit = 50, status?: string) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const rows = await db
      .select()
      .from(paymentDisputes)
      .where(status ? eq(paymentDisputes.status, status as any) : undefined)
      .orderBy(desc(paymentDisputes.openedAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = rows.length > limit;
    return {
      items: hasMore ? rows.slice(0, limit) : rows,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async openPaymentDispute(
    paymentId: string,
    providerDisputeId: string,
    disputeReason: string,
    amountUsd: number | null,
    metadataJson: Record<string, unknown> | undefined,
    adminId: string,
  ) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
    }

    const [existing] = await db
      .select()
      .from(paymentDisputes)
      .where(eq(paymentDisputes.providerDisputeId, providerDisputeId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [dispute] = await db
      .insert(paymentDisputes)
      .values({
        paymentId,
        providerDisputeId,
        disputeReason,
        amountUsd: String(amountUsd ?? Number(payment.amountUsd)),
        status: "OPEN" as any,
        metadataJson,
        createdByAdminId: adminId,
      })
      .returning();

    await db
      .update(payments)
      .set({ status: "DISPUTED" as any, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    return dispute!;
  }

  async resolvePaymentDispute(disputeId: string, status: "UNDER_REVIEW" | "WON" | "LOST" | "RESOLVED", resolutionNotes?: string) {
    const [dispute] = await db.select().from(paymentDisputes).where(eq(paymentDisputes.id, disputeId)).limit(1);
    if (!dispute) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Payment dispute not found" });
    }

    const [updated] = await db
      .update(paymentDisputes)
      .set({
        status: status as any,
        resolutionNotes: resolutionNotes ?? dispute.resolutionNotes,
        resolvedAt: status === "UNDER_REVIEW" ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentDisputes.id, disputeId))
      .returning();

    const paymentStatus = status === "WON"
      ? "COMPLETED"
      : status === "LOST"
        ? "REFUNDED"
        : "DISPUTED";

    await db
      .update(payments)
      .set({ status: paymentStatus as any, updatedAt: new Date() })
      .where(eq(payments.id, dispute.paymentId));

    return updated!;
  }

  async createRefund(
    paymentId: string,
    amountUsd: number | null,
    idempotencyKey: string | undefined,
    adminId: string,
  ) {
    const idemKey = idempotencyKey ?? generateIdempotencyKey(adminId, "refund", paymentId);
    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "payments:refund",
        actorUserId: adminId,
        requestData: { paymentId, amountUsd },
      },
      async () => {
        const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
        if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
        if (payment.status !== "COMPLETED" as any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed payments can be refunded" });
        }
        const refundAmountUsd = amountUsd ?? Number(payment.amountUsd);
        const coinsToDebit = payment.coinsCredited;
        await this.walletService.debitCoins(
          payment.userId,
          coinsToDebit,
          "REFUND",
          paymentId,
          `Refund for payment ${paymentId}`,
          generateIdempotencyKey(payment.userId, "refund_debit", paymentId),
        );
        await db
          .update(payments)
          .set({
            status: "REFUNDED" as any,
            refundAmount: String(refundAmountUsd),
            refundedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payments.id, paymentId));
        return { success: true, paymentId, refundAmountUsd, coinsDebited: coinsToDebit };
      },
    );
  }

  /** Run payment reconciliation: find COMPLETED payments without a matching PURCHASE coin transaction. */
  async runPaymentReconciliation(limit = 500) {
    const completed = await db
      .select({ id: payments.id, userId: payments.userId, coinsCredited: payments.coinsCredited })
      .from(payments)
      .where(eq(payments.status, "COMPLETED" as any))
      .limit(limit);
    const missing: string[] = [];
    for (const p of completed) {
      const [tx] = await db
        .select()
        .from(coinTransactions)
        .where(
          and(
            eq(coinTransactions.referenceId, p.id),
            eq(coinTransactions.transactionType, "PURCHASE" as any),
          ),
        )
        .limit(1);
      if (!tx) missing.push(p.id);
    }
    const purchaseTransactions = await db
      .select({ referenceId: coinTransactions.referenceId })
      .from(coinTransactions)
      .where(eq(coinTransactions.transactionType, "PURCHASE" as any))
      .limit(limit * 2);
    const orphanPurchaseReferenceIds = purchaseTransactions
      .map((transaction) => transaction.referenceId)
      .filter((referenceId): referenceId is string => !!referenceId)
      .filter((referenceId) => !completed.some((payment) => payment.id === referenceId));
    return { checked: completed.length, missingPaymentIds: missing, orphanPurchaseReferenceIds };
  }
}
