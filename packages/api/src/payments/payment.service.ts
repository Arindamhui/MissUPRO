import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { payments, webhookEvents } from "@missu/db/schema";
import { eq } from "drizzle-orm";
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
      const [timestamp, sig] = signature.split(",");
      const expectedSig = createHmac("sha256", stripeSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");
      isValid = sig ? timingSafeEqual(
        Buffer.from(sig),
        Buffer.from(expectedSig),
      ) : false;
    } else if (provider === "RAZORPAY") {
      const expectedSig = createHmac("sha256", razorpaySecret)
        .update(payload)
        .digest("hex");
      isValid = timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig),
      );
    }

    if (!isValid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid webhook signature" });
    }

    const parsed = JSON.parse(payload);
    const payloadHash = createHmac("sha256", "webhook").update(payload).digest("hex");

    await db.insert(webhookEvents).values({
      provider: provider as any,
      providerEventId: parsed.id ?? "unknown",
      signatureValid: true,
      payloadHash,
      receivedAt: new Date(),
      processingStatus: "PENDING" as any,
    });

    return { verified: true };
  }
}
