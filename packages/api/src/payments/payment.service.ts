import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { payments, webhookEvents } from "@missu/db/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createHmac, timingSafeEqual } from "node:crypto";

@Injectable()
export class PaymentService {
  async createPaymentIntent(userId: string, coinPackageId: string, provider: string) {
    const [payment] = await db.insert(payments).values({
      userId,
      coinPackageId,
      provider: provider as any,
      status: "PENDING" as any,
      amountUsd: "0.00",
      coinsCredited: 0,
      idempotencyKey: `${userId}_${coinPackageId}_${Date.now()}`,
    }).returning();
    return payment!;
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
    const providerEventId = parsed.id ?? parsed.event ?? parsed.event_id;
    if (!providerEventId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Webhook payload missing event id" });
    }

    const [existingEvent] = await db
      .select()
      .from(webhookEvents)
      .where(and(eq(webhookEvents.provider, provider as any), eq(webhookEvents.providerEventId, providerEventId)))
      .limit(1);

    if (existingEvent?.providerEventId === providerEventId) {
      return { verified: true, replay: true };
    }

    const payloadHash = createHmac("sha256", "webhook").update(payload).digest("hex");

    await db.insert(webhookEvents).values({
      provider: provider as any,
      providerEventId,
      signatureValid: true,
      payloadHash,
      receivedAt: new Date(),
      processingStatus: "PENDING" as any,
    });

    return { verified: true };
  }
}
