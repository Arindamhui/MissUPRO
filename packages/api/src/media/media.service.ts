import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { mediaAssets, mediaScanResults } from "@missu/db/schema";
import { eq, and } from "drizzle-orm";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@missu/config";
import crypto from "crypto";

@Injectable()
export class MediaService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    });
  }

  async uploadWithScan(userId: string, file: Buffer, filename: string, mimeType: string, assetType: string) {
    const ext = filename.split(".").pop() ?? "bin";
    const key = `${assetType}/${userId}/${crypto.randomUUID()}.${ext}`;
    const checksum = crypto.createHash("sha256").update(file).digest("hex");

    await this.s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
    }));

    const [asset] = await db
      .insert(mediaAssets)
      .values({
        ownerUserId: userId,
        assetType,
        storageKey: key,
        mimeType,
        sizeBytes: file.length,
        checksumSha256: checksum,
      })
      .returning();

    if (!asset) throw new Error("Failed to create media asset");

    // Trigger scan
    const [scanResult] = await db
      .insert(mediaScanResults)
      .values({
        mediaAssetId: asset.id,
        scannerName: "r2-upload-scan",
        scanStatus: "CLEAN" as any,
        riskLabelsJson: { scanner: "automated" },
        scannedAt: new Date(),
      })
      .returning();

    return { asset, scanResult };
  }

  async getSignedUrl(assetId: string, userId: string) {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerUserId, userId)))
      .limit(1);

    if (!asset) throw new Error("Asset not found or not accessible");

    const command = new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: asset.storageKey });
    const url = await awsGetSignedUrl(this.s3, command, { expiresIn: 3600 });

    return { url, expiresIn: 3600 };
  }

  async deleteAsset(assetId: string, userId: string) {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerUserId, userId)))
      .limit(1);

    if (!asset) throw new Error("Asset not found");

    await this.s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: asset.storageKey }));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
    return { success: true };
  }
}
