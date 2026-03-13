# HOW TO RUN — MissUPRO Platform

Complete step-by-step guide to run the MissUPRO platform locally and deploy to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Install](#2-clone--install)
3. [Environment Setup](#3-environment-setup)
4. [Database Setup](#4-database-setup)
5. [Running Locally](#5-running-locally)
6. [Running with Docker](#6-running-with-docker)
7. [Mobile App (Expo)](#7-mobile-app-expo)
8. [Third-Party Service Setup](#8-third-party-service-setup)
9. [Deployment](#9-deployment)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool         | Minimum Version | Install Link                                     |
| ------------ | --------------- | ------------------------------------------------ |
| Node.js      | 20 LTS          | https://nodejs.org/                               |
| npm          | 10.x            | Bundled with Node.js (see `packageManager` field)  |
| Git          | 2.x             | https://git-scm.com/                              |
| Docker       | 24.x (optional) | https://docs.docker.com/get-docker/               |
| Redis        | 7.x             | https://redis.io/docs/install/ or use Docker      |
| PostgreSQL   | 16.x (optional) | Only if not using Neon serverless                  |
| Expo CLI     | Latest           | `npx expo --version` (bundled with Expo SDK)       |
| Android Studio / Xcode | Latest  | For mobile emulators                             |

---

## 2. Clone & Install

```bash
git clone <repository-url> MissUPRO
cd MissUPRO

# Install all workspace dependencies
npm install --legacy-peer-deps --ignore-scripts
```

This installs dependencies for all packages:
- `packages/db` — Drizzle ORM schemas (105 tables)
- `packages/types` — Shared TypeScript types & Zod schemas
- `packages/config` — Environment config & business defaults
- `packages/utils` — Shared utility functions
- `packages/api` — NestJS + tRPC backend (28 domain modules)
- `apps/web` — Next.js 14 admin panel
- `apps/mobile` — Expo React Native app

---

## 3. Environment Setup

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in the values:

### Required for local development

| Variable           | Description                              |
| ------------------ | ---------------------------------------- |
| `DATABASE_URL`     | Neon PostgreSQL connection string, or `postgresql://missu:missu_dev_password@localhost:5432/missu` for local PG |
| `REDIS_URL`        | Redis connection URL. Default: `redis://127.0.0.1:6379` |
| `JWT_SECRET`       | Random 256-bit key for auth tokens       |
| `JWT_REFRESH_SECRET` | Different random key for refresh tokens |

### Required for full functionality

| Variable                            | Description                  |
| ----------------------------------- | ---------------------------- |
| `CLERK_SECRET_KEY`                  | Clerk backend API key        |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (Web)     |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (Mobile)  |
| `STRIPE_SECRET_KEY`                 | Stripe secret API key        |
| `STRIPE_WEBHOOK_SECRET`            | Stripe webhook signing secret |
| `RAZORPAY_KEY_ID`                  | Razorpay key ID              |
| `RAZORPAY_KEY_SECRET`              | Razorpay key secret          |
| `AGORA_APP_ID`                     | Agora RTC app ID             |
| `AGORA_APP_CERTIFICATE`            | Agora RTC certificate        |
| `CLOUDFLARE_R2_ACCESS_KEY`         | R2 access key                |
| `CLOUDFLARE_R2_SECRET_KEY`         | R2 secret key                |
| `CLOUDFLARE_R2_BUCKET`             | R2 bucket name               |
| `CLOUDFLARE_R2_ENDPOINT`           | R2 endpoint URL              |
| `SENTRY_DSN`                       | Sentry error tracking DSN    |

---

## 4. Database Setup

### Option A: Neon Serverless (recommended)

1. Create a project at https://neon.tech
2. Copy the connection string to `DATABASE_URL` in `.env`
3. Push the schema:

```bash
pnpm turbo db:push --filter=@missu/db
```

### Option B: Local PostgreSQL

```bash
# Start PostgreSQL via Docker
docker run -d --name missu-pg \
  -e POSTGRES_USER=missu \
  -e POSTGRES_PASSWORD=missu_dev_password \
  -e POSTGRES_DB=missu \
  -p 5432:5432 \
  postgres:16-alpine

# Set DATABASE_URL in .env:
# DATABASE_URL=postgresql://missu:missu_dev_password@localhost:5432/missu

# Push schema
npm run db:migrate
```

### Generate Drizzle migrations (optional)

```bash
npm run db:generate
npm run db:migrate
```

---

## 5. Running Locally

### Start all services (Turborepo)

```bash
# Start everything (API + Web admin)
npm run dev
```

This runs:
- **API Server**: http://localhost:4000 (NestJS + tRPC + Socket.io)
- **Admin Panel**: http://localhost:3000 (Next.js)

### Start individual services

```bash
# API only
cd packages/api && npm run dev

# Web admin only
cd apps/web && npm run dev

# Build all packages
npm run build
```

### Redis

Start Redis before the API:

```bash
# macOS (Homebrew)
brew services start redis

# Docker
docker run -d --name missu-redis -p 6379:6379 redis:7-alpine

# Windows (WSL or Docker)
docker run -d --name missu-redis -p 6379:6379 redis:7-alpine
```

### Verify everything is running

- API health: http://localhost:4000/health
- Admin panel: http://localhost:3000
- tRPC playground: http://localhost:4000/trpc (if enabled)
- Socket.io: ws://localhost:4000 (WebSocket)

---

## 6. Running with Docker

```bash
cd infra/docker

# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f api
docker compose logs -f web

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

Services:
| Service    | Port | URL                     |
| ---------- | ---- | ----------------------- |
| API        | 4000 | http://localhost:4000    |
| Web Admin  | 3000 | http://localhost:3000    |
| PostgreSQL | 5432 | localhost:5432           |
| Redis      | 6379 | localhost:6379           |

---

## 7. Mobile App (Expo)

```bash
cd apps/mobile

# Start the Expo dev server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator (macOS only)
npx expo run:ios

# Run on physical device (scan QR code from Expo Go)
npx expo start --tunnel
```

### Environment

Set `EXPO_PUBLIC_API_URL` in the mobile app to point to your API:
- Local development: `http://<your-ip>:4000` (not `localhost` — the device needs your machine's IP)
- Production: Your deployed API URL

### Building for production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 8. Third-Party Service Setup

### Clerk (Authentication)

1. Create an app at https://clerk.com
2. Copy API keys to `.env`
3. Configure sign-in methods (email, phone, social)
4. Set webhook URL: `https://your-api.com/webhooks/clerk`

### Stripe (Payments)

1. Create account at https://stripe.com
2. Copy API keys to `.env`
3. Set webhook URL: `https://your-api.com/webhooks/stripe`
4. Configure webhook events: `payment_intent.succeeded`, `charge.refunded`, `customer.subscription.*`

### Razorpay (India Payments)

1. Create account at https://razorpay.com
2. Copy API keys to `.env`
3. Set webhook URL: `https://your-api.com/webhooks/razorpay`

### Agora RTC (Voice/Video Calls & Streaming)

1. Create project at https://console.agora.io
2. Copy App ID and certificate to `.env`
3. Enable required features: voice, video, live streaming

### Cloudflare R2 (Object Storage)

1. Create R2 bucket at https://dash.cloudflare.com
2. Create API token with R2 read/write permissions
3. Copy credentials to `.env`

### Sentry (Error Tracking)

1. Create project at https://sentry.io
2. Copy DSN to `.env`

---

## 9. Deployment

### Option A: Docker-based (VPS / Cloud VM)

```bash
# On your server
git pull origin main

cd infra/docker
docker compose -f docker-compose.yml up --build -d
```

### Option B: Platform-as-a-Service

**API (NestJS)** — Deploy to Railway, Render, Fly.io, or AWS ECS:
```bash
# Railway
railway up

# Fly.io
fly launch --dockerfile infra/docker/Dockerfile.api
fly deploy
```

**Web Admin (Next.js)** — Deploy to Vercel:
```bash
# Vercel (auto-detects Next.js)
npx vercel --prod
```

**Mobile** — Build and submit via EAS (see Section 7)

### CI/CD

The GitHub Actions pipeline at `infra/ci/.github/workflows/ci.yml` runs:
1. **Quality** — Lint + type check on all PRs
2. **Tests** — Unit + integration tests with test DB & Redis
3. **Build** — Full Turborepo build
4. **Docker** — Build & push images to GHCR (main branch only)
5. **Deploy** — Placeholder for your deploy command (main branch only)

To enable:
1. Copy `infra/ci/.github` to the repo root `.github`
2. Set `TURBO_TOKEN` secret for remote caching (optional)
3. Set deploy commands in the deploy job

---

## 10. Troubleshooting

### Common Issues

**pnpm/npm install fails**
```bash
npm install --legacy-peer-deps --ignore-scripts
```

**Database connection error**
- Verify `DATABASE_URL` is correct in `.env`
- Check PostgreSQL is running: `docker ps` or `pg_isready`
- For Neon: ensure SSL mode is `require`

**Redis connection error**
- Verify Redis is running: `redis-cli ping` should return `PONG`
- Check `REDIS_URL` in `.env`

**Port already in use**
```bash
# Find and kill process on port 4000
lsof -ti:4000 | xargs kill -9   # macOS/Linux
netstat -ano | findstr :4000     # Windows → then taskkill /PID <pid> /F
```

**Expo: "emulator offline" on Windows**
```bash
adb kill-server
adb start-server
adb devices -l
# Wait for emulator to show as "device", then retry
npx expo run:android
```

**Turbo build cache issues**
```bash
npx turbo build --force
```

**Type errors after schema changes**
```bash
pnpm turbo build --filter=@missu/db
pnpm turbo build --filter=@missu/types
```

---

## Project Structure

```
MissUPRO/
├── apps/
│   ├── web/                    # Next.js 14 admin panel
│   └── mobile/                 # Expo React Native app
├── packages/
│   ├── api/                    # NestJS + tRPC backend (28 modules)
│   ├── db/                     # Drizzle ORM (105 tables)
│   ├── types/                  # Shared types & Zod schemas
│   ├── config/                 # Environment & business config
│   └── utils/                  # Shared utilities
├── infra/
│   ├── docker/                 # Dockerfiles + docker-compose
│   └── ci/                     # GitHub Actions CI/CD
├── plan.md                     # Architecture specification
├── HOW_TO_RUN.md               # This file
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace config
└── .env.example                # Environment template
```

---

## Key URLs (Local Development)

| Service         | URL                        |
| --------------- | -------------------------- |
| API             | http://localhost:4000       |
| API Health      | http://localhost:4000/health|
| Admin Panel     | http://localhost:3000       |
| WebSocket       | ws://localhost:4000         |
| PostgreSQL      | localhost:5432              |
| Redis           | localhost:6379              |

---

## Tech Stack Summary

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Database        | Neon PostgreSQL + Drizzle ORM                    |
| Backend API     | NestJS + tRPC + Zod                              |
| Realtime        | Socket.io + Redis adapter                        |
| Admin Panel     | Next.js 14 + Tailwind CSS                        |
| Mobile App      | Expo + React Native + Expo Router + Zustand      |
| Auth            | Clerk                                            |
| Payments        | Stripe + Razorpay + Apple IAP + Google Play      |
| Voice/Video     | Agora RTC                                        |
| Object Storage  | Cloudflare R2                                    |
| Error Tracking  | Sentry                                           |
| CI/CD           | GitHub Actions + Docker + GHCR                   |
| Monorepo        | Turborepo + pnpm workspaces                      |
