import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Neon PostgreSQL
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  // Clerk Auth
  CLERK_SECRET_KEY: z.string().default(""),
  CLERK_PUBLISHABLE_KEY: z.string().default(""),
  CLERK_WEBHOOK_SECRET: z.string().default(""),

  // JWT (internal service-to-service)
  JWT_SECRET: z.string().default("dev-jwt-secret-change-in-production-min32chars"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production32"),

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
