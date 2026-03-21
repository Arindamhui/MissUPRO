import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", ".env") });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Neon PostgreSQL
  DATABASE_URL: z
    .string()
    .default("postgresql://missu:missu_dev_password@localhost:5432/missu"),

  // Redis
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  // Auth
  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production-min32chars"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production32"),
  JWT_ISSUER: z.string().default("missu-pro"),
  JWT_AUDIENCE: z.string().default("missu-pro-clients"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_DOMAIN: z.string().default(""),
  GOOGLE_CLIENT_IDS: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),

  // Stripe
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),

  // Apple IAP
  APPLE_SHARED_SECRET: z.string().default(""),
  APPLE_BUNDLE_ID: z.string().default(""),

  // Agora RTC
  AGORA_APP_ID: z.string().default(""),
  AGORA_APP_CERTIFICATE: z.string().default(""),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default(""),
  R2_PUBLIC_URL: z.string().default("https://placeholder.r2.dev"),
  R2_ENDPOINT: z.string().default(""),

  DEFAULT_AGENCY_PUBLIC_ID: z.string().default(""),
  API_BASE_URL: z.string().default("http://localhost:3000"),
  BULLMQ_PREFIX: z.string().default("missu-pro"),
  BULLMQ_QUEUE_NAME: z.string().default("missu-domain-events"),

  // Sentry
  SENTRY_DSN: z.string().optional(),

  // FCM / Push
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

export { envSchema };
