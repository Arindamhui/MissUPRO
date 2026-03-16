# SK Lite Style Social Live Streaming Platform

## Architecture Overview

This platform is implemented as a monorepo with a single source of truth for types, data access, and feature boundaries.

- Frontend: Next.js App Router in `apps/web`
- API: Nest-hosted tRPC router in `packages/api`
- Validation: Zod on every route input
- Data: Drizzle ORM over Neon PostgreSQL in `packages/db`
- State and caching: React Query via tRPC hooks in `apps/web`
- Shared domain contracts: workspace packages under `packages/*`

### Core Flow

1. App Router pages render feature screens from `apps/web/src/features/*`.
2. Client components call tRPC procedures through React Query.
3. tRPC procedures validate inputs with Zod and delegate to feature services.
4. Services perform all reads and writes through Drizzle only.
5. UI consumes normalized feature DTOs rather than raw table rows.

### Folder Architecture

```text
apps/web/src/
  app/
    discover/
      page.tsx
      layout.tsx
      [streamId]/page.tsx
  components/
      auth-bridge.tsx
    ui/
      avatar.tsx
      badge.tsx
      button.tsx
      card.tsx
      skeleton.tsx
      tabs.tsx
  features/
    discover/
      components/
        live-discovery-screen.tsx
        live-stream-card.tsx
        stream-preview-screen.tsx
      viewer-room/
         components/
            live-room-screen.tsx
         hooks/
            use-live-room-socket.ts

packages/api/src/
  streaming/
    live.router.ts
    live.service.ts

packages/db/schema/
  live.ts
  users.ts
  social.ts
```

## Phase Plan

### Phase 1: Discovery Lobby

1. Folder structure
   - Add `app/discover` routes for the public live lobby and stream preview.
   - Add reusable UI primitives under `apps/web/src/components/ui`.
   - Add feature-specific screens under `apps/web/src/features/discover/components`.
2. Database schema
   - Reuse existing `live_rooms`, `live_streams`, `live_viewers`, `chat_messages`, `users`, and `followers` tables.
   - No schema change in this phase because the current tables already support a public discovery slice.
3. API routes
   - `live.getDiscoveryFeed`
   - `live.getStreamPreview`
4. React components
   - Discovery shell
   - Stream cards
   - Spotlight hero
   - Preview screen with related streams and recent chat
5. UI layout
   - Mobile-first browse-first shell inspired by SK Lite style discovery surfaces.
   - Sticky header, horizontal category rail, spotlight card, responsive stream grid.
6. Logic implementation
   - Public live feed sorted by trending, viewers, or newest.
   - Category filtering.
   - Stream preview with recent chat and related streams.
7. Edge cases
   - Empty feed when no one is live.
   - Missing avatars.
   - Invalid or offline stream preview.
   - Slow filter transitions with previous data preserved.
8. Performance optimization
   - Aggregated summary query.
   - Limited result sets.
   - Deferred filter state on the client.
   - React Query stale caching and previous-data preservation.

### Phase 2: Viewer Room

1. Folder structure
   - Add a dedicated watch room feature under `apps/web/src/features/viewer-room`.
   - Add a socket hook that is dormant for guests and connects automatically for signed-in viewers.
   - Add an auth bridge so the web client can reuse the existing Clerk-backed protected procedures.
2. Database schema
   - Reuse `live_viewers` and `chat_messages`.
   - Reuse `gift_transactions` for top supporter ranking and creator-economy summaries.
   - Add event logging only if product analytics needs more granular playback telemetry.
3. API routes
   - `live.getViewerRoom`
   - Reuse `live.joinStream`, `live.leaveStream`, and gateway socket events for viewer presence.
   - Reuse `gift.sendGift` and `wallet.getBalance` with authenticated client headers.
4. React components
   - Live stage shell
   - Realtime chat rail
   - Gift tray with quick-send actions
   - Wallet and coin package drawer
   - Top supporter rail
5. UI layout
   - Mobile-first immersive stage with a creator-economy side rail and stacked support modules.
6. Logic implementation
   - Aggregate stream, config, gifting, pricing, and top-supporter state into one room payload.
   - Join and sync the room over Socket.IO when a viewer is authenticated.
   - Degrade safely for guests while preserving the full live-room shell.
   - Send chat over the gateway and trigger gift overlays after successful gift mutations.
7. Edge cases
   - Missing Clerk publishable key on web.
   - Guest viewers with no wallet or socket token.
   - Network reconnect and room resync.
   - Moderated or deleted chat messages.
8. Performance optimization
   - Single room hydration query.
   - Reuse gateway sync events instead of polling chat aggressively.
   - Keep guest rendering read-only until an authenticated session is available.

### Phase 3: Creator Broadcast Console

1. Folder structure
   - Add `apps/web/src/features/creator-console`.
2. Database schema
   - Reuse `live_rooms` and `live_streams`.
   - Extend only if broadcast presets or moderation presets need persistence.
3. API routes
   - `live.createRoom`
   - `live.startStream`
   - `live.endStream`
4. React components
   - Broadcast setup form
   - Stream health panel
   - Moderation queue
5. UI layout
   - Creator dashboard with preflight checks and stream controls.
6. Logic implementation
   - Room creation.
   - Go-live orchestration.
   - End-stream summary.
7. Edge cases
   - Duplicate room creation.
   - Stream already live.
   - Unclean disconnect.
8. Performance optimization
   - Precomputed creator defaults.
   - Batched mutations.
   - WebSocket-driven state updates.

### Phase 4: Social Graph and Retention

1. Folder structure
   - Add `apps/web/src/features/social`.
2. Database schema
   - Reuse `followers`, `profiles`, `notifications`, and recommendation tables.
3. API routes
   - `social.followUser`
   - `social.unfollowUser`
   - `discovery.getHomeFeed`
   - `notification.list`
4. React components
   - Follow buttons
   - Personalized rails
   - Notification inbox
5. UI layout
   - Feed-first discovery with creator rails and follow-driven surfaces.
6. Logic implementation
   - Follow graph mutations.
   - Personalized recommendation hydration.
   - Retention nudges.
7. Edge cases
   - Self-follow attempts.
   - Blocked users.
   - Empty recommendations.
8. Performance optimization
   - Cached recommendation candidates.
   - Impression batching.
   - Pagination cursors.

### Phase 5: Monetization and Safety

1. Folder structure
   - Add `apps/web/src/features/monetization` and `apps/web/src/features/safety`.
2. Database schema
   - Reuse `wallets`, `payments`, `gifts`, `moderation`, `idempotency`, and `compliance` tables.
3. API routes
   - Gift purchase and send routes.
   - Wallet and payment routes.
   - Moderation and fraud routes.
4. React components
   - Wallet sheet
   - Gift catalog
   - Moderation banners
5. UI layout
   - In-room monetization tray with friction-controlled purchase flows.
6. Logic implementation
   - Idempotent payments.
   - Gift sending.
   - Abuse controls and enforcement states.
7. Edge cases
   - Duplicate purchase webhooks.
   - Insufficient balance.
   - Suspended creator or user.
8. Performance optimization
   - Idempotency keys.
   - Batched wallet reads.
   - Abuse rule short-circuiting.

### Phase 6: Realtime Scale and Operations

1. Folder structure
   - Expand realtime, analytics, and infra integration points.
2. Database schema
   - Keep transactional data in Postgres.
   - Push high-volume ephemeral presence and socket fanout to Redis-backed realtime services.
3. API routes
   - Presence state.
   - Analytics summaries.
   - Admin live operations.
4. React components
   - Realtime counters.
   - Creator quality dashboards.
   - Admin monitoring panels.
5. UI layout
   - Operational views for SRE, trust, and content operations.
6. Logic implementation
   - Presence fanout.
   - Live ranking refresh.
   - Operational interventions.
7. Edge cases
   - Socket partition.
   - Redis degradation.
   - Ranking stale windows.
8. Performance optimization
   - Read-model caching.
   - Background score recomputation.
   - Query-level indexes and observability.

## Implementation Rule

Execution proceeds sequentially. Phases 1 and 2 are implemented in this change set.