import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "@missu/config";

const env = getEnv();

const s3Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT || undefined,
  credentials: env.R2_ACCESS_KEY_ID
    ? {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      }
    : undefined,
});

export const storageService = {
  async uploadHostDocuments(userId: string, requestId: string, documents: Array<{ fileName: string; contentType: string; base64Data: string }>) {
    const uploaded: Array<{ fileName: string; contentType: string; objectKey: string; url: string }> = [];

    for (const document of documents) {
      const objectKey = `host-requests/${userId}/${requestId}/${randomUUID()}-${document.fileName}`;
      const body = Buffer.from(document.base64Data, "base64");
      await s3Client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: body,
          ContentType: document.contentType,
        }),
      );

      uploaded.push({
        fileName: document.fileName,
        contentType: document.contentType,
        objectKey,
        url: `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`,
      });
    }

    return uploaded;
  },

  async uploadGiftAsset(adminUserId: string, file: { fileName: string; contentType: string; bytes: Uint8Array }) {
    const objectKey = `admin-assets/gifts/${adminUserId}/${randomUUID()}-${file.fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: objectKey,
        Body: file.bytes,
        ContentType: file.contentType,
      }),
    );

    return {
      objectKey,
      url: `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`,
      contentType: file.contentType,
      fileName: file.fileName,
    };
  },
};