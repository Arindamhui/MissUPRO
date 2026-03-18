"use client";

import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import { Activity, Flame, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsButton } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getWebRuntimeScope } from "@/lib/runtime-config";
import { formatNumber } from "@/lib/utils";
import { LiveStreamCard, type DiscoveryStreamCardData } from "./live-stream-card";

const sortOptions = [
  { id: "trending", label: "Trending" },
  { id: "viewers", label: "Most viewed" },
  { id: "newest", label: "Newest" },
] as const;

interface DiscoveryFeedData {
  summary: {
    liveStreams: number;
    activeViewers: number;
    liveHosts: number;
  };
  categories: Array<{
    category: string;
    count: number;
  }>;
  spotlight: DiscoveryStreamCardData[];
  liveNow: DiscoveryStreamCardData[];
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <Card className="border-white/8 bg-white/5">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-2xl bg-white/8 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/48">{label}</p>
          <p className="mt-1 text-xl font-semibold text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryLoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <Skeleton className="h-52 rounded-none" />
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveDiscoveryScreen() {
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["id"]>("trending");
  const runtimeScope = getWebRuntimeScope();

  const deferredCategory = useDeferredValue(category);
  const deferredSort = useDeferredValue(sort);
  const bootstrapQuery = trpc.config.getBootstrap.useQuery(runtimeScope, { retry: false });
  const liveStreamingFlag = ((bootstrapQuery.data?.featureFlags ?? []) as Array<{ flagKey?: string; enabled?: boolean }>).find(
    (flag) => String(flag.flagKey ?? "") === "live_streaming",
  );
  const liveStreamingEnabled = liveStreamingFlag?.enabled ?? true;

  const discoveryQuery = trpc.live.getDiscoveryFeed.useQuery(
    {
      category: deferredCategory === "ALL" ? undefined : deferredCategory,
      sort: deferredSort,
      limit: 18,
    },
    {
      enabled: liveStreamingEnabled !== false,
      retry: false,
      placeholderData: keepPreviousData,
    },
  );

  const discoveryData = discoveryQuery.data as DiscoveryFeedData | undefined;
  const summary = discoveryData?.summary;
  const categories = discoveryData?.categories ?? [];
  const spotlight = discoveryData?.spotlight?.[0];
  const liveNow = discoveryData?.liveNow ?? [];

  if (liveStreamingEnabled === false) {
    return (
      <div className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto flex max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="w-full border-dashed border-white/12 bg-white/4">
            <CardContent className="space-y-4 p-8">
              <Badge variant="neutral" className="w-fit">Disabled</Badge>
              <div>
                <h1 className="text-2xl font-semibold text-white">Live discovery is disabled for this web version</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
                  The `live_streaming` feature flag is currently off for the active web runtime scope, so the public lobby stays hidden.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/8 bg-[rgba(5,8,22,0.82)] px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/46">MissU Pro Live</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Discovery lobby</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/live">
                <Button variant="secondary" size="sm">Admin live</Button>
              </Link>
              <Link href="/admin/dashboard">
                <Button size="sm">Control room</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
          <Card className="overflow-hidden border-white/12 bg-[radial-gradient(circle_at_top_left,_rgba(255,184,77,0.16),_transparent_36%),linear-gradient(135deg,_rgba(255,107,61,0.18),_rgba(109,46,200,0.12)_40%,_rgba(5,8,22,0.92)_72%)]">
            <CardContent className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="live">Phase 1</Badge>
                <Badge variant="neutral">Public discovery</Badge>
                {discoveryQuery.isFetching ? <Badge>Refreshing</Badge> : null}
              </div>

              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Browse the room list like a product, not a placeholder grid.
                </h2>
                <p className="max-w-xl text-sm leading-7 text-white/66 sm:text-base">
                  This first phase turns the public web surface into a real discovery layer: trending live rooms, category filtering,
                  spotlight ranking, and preview pages that already align with the existing live-streaming backend.
                </p>
              </div>

              {spotlight ? (
                <div className="grid gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5 sm:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/46">Spotlight stream</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">{spotlight.title}</h3>
                    <p className="mt-2 text-sm text-white/64">
                      {spotlight.hostDisplayName} is leading {spotlight.viewerCount} viewers in {spotlight.category}.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href={`/discover/${spotlight.streamId}`}>
                        <Button>Open preview</Button>
                      </Link>
                      <Link href="/admin/live">
                        <Button variant="secondary">Review operations</Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/48">Current viewers</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(spotlight.viewerCount)}</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/48">Peak viewers</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(spotlight.peakViewers)}</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/48">Gift revenue</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(spotlight.giftRevenueCoins)}</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/48">Trending score</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{spotlight.trendingScore.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/62">
                  No spotlight stream is available yet. The lobby will populate automatically when the first creator goes live.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Live rooms" value={formatNumber(summary?.liveStreams ?? 0)} icon={Radio} />
            <StatCard label="Active viewers" value={formatNumber(summary?.activeViewers ?? 0)} icon={Users} />
            <StatCard label="Live hosts" value={formatNumber(summary?.liveHosts ?? 0)} icon={Flame} />
          </div>
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.6fr_0.7fr]">
          <div className="space-y-4">
            <Card className="border-white/8 bg-white/4">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Live now</CardTitle>
                    <CardDescription>Public browse feed backed by typed tRPC queries and Drizzle read models.</CardDescription>
                  </div>
                  <Badge variant="hot">{liveNow.length} rooms</Badge>
                </div>
                <Tabs>
                  <TabsButton
                    active={category === "ALL"}
                    onClick={() => startTransition(() => setCategory("ALL"))}
                  >
                    All
                  </TabsButton>
                  {categories.map((item) => (
                    <TabsButton
                      key={item.category}
                      active={category === item.category}
                      onClick={() => startTransition(() => setCategory(item.category))}
                    >
                      {item.category}
                    </TabsButton>
                  ))}
                </Tabs>
                <Tabs className="pt-1">
                  {sortOptions.map((item) => (
                    <TabsButton
                      key={item.id}
                      active={sort === item.id}
                      onClick={() => startTransition(() => setSort(item.id))}
                    >
                      {item.label}
                    </TabsButton>
                  ))}
                </Tabs>
              </CardHeader>
            </Card>

            {discoveryQuery.isLoading ? (
              <DiscoveryLoadingState />
            ) : liveNow.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {liveNow.map((stream) => (
                  <LiveStreamCard key={stream.streamId} stream={stream} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-white/12 bg-white/4">
                <CardContent className="flex flex-col items-start gap-4 p-8">
                  <Badge variant="neutral">Empty state</Badge>
                  <div>
                    <h3 className="text-xl font-semibold text-white">No streams match this filter</h3>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-white/62">
                      The discovery feed stays stable when filters change, but there are no live rooms for the current selection.
                      Reset the category or switch sort order to broaden the feed.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => startTransition(() => setCategory("ALL"))}>Reset filters</Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <Badge variant="neutral" className="w-fit">Phase scope</Badge>
                <CardTitle>What this phase delivers</CardTitle>
                <CardDescription>
                  Public browse, stream preview, clean feature folders, reusable UI primitives, and typed feed contracts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/68">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2 text-white"><Sparkles className="h-4 w-4" /> Discovery UX</div>
                  <p className="mt-2 leading-7">Spotlight ranking, category chips, previewable cards, and mobile-first responsive layouts.</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4" /> Production guardrails</div>
                  <p className="mt-2 leading-7">Validated inputs, bounded limits, empty-state handling, and previous data retention during refresh.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}