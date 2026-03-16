"use client";

import Link from "next/link";
import { ArrowLeft, Flame, MessageCircle, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import { LiveStreamCard, type DiscoveryStreamCardData } from "./live-stream-card";

interface StreamPreviewData {
  stream: DiscoveryStreamCardData & {
    followerCount: number;
  };
  recentChat: Array<{
    id: string;
    username: string;
    message: string;
    createdAt: string;
  }>;
  relatedStreams: DiscoveryStreamCardData[];
}

function PreviewLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-80 w-full" />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function StreamPreviewScreen({ streamId }: { streamId: string }) {
  const previewQuery = trpc.live.getStreamPreview.useQuery({ streamId }, { retry: false });
  const previewData = previewQuery.data as StreamPreviewData | undefined;

  if (previewQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PreviewLoadingState />
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-dashed border-white/12 bg-white/4">
            <CardContent className="space-y-4 p-8">
              <Badge variant="neutral" className="w-fit">Unavailable</Badge>
              <h1 className="text-2xl font-semibold text-white">This stream is no longer available</h1>
              <p className="max-w-2xl text-sm leading-7 text-white/62">
                The preview only serves live rooms. The host may have ended the session, or the stream id may be invalid.
              </p>
              <Link href="/discover">
                <Button variant="secondary">Back to discovery</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { stream, recentChat, relatedStreams } = previewData;

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/discover" className="inline-flex items-center gap-2 text-sm text-white/62 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to discovery
          </Link>
          <Link href="/admin/live">
            <Button size="sm">Open live operations</Button>
          </Link>
        </div>

        <Card className="overflow-hidden border-white/12 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,61,0.16),_transparent_32%),linear-gradient(135deg,_rgba(109,46,200,0.16),_rgba(9,14,31,0.92)_72%)]">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="live">Live</Badge>
                <Badge variant="hot">{stream.category}</Badge>
                <Badge>{stream.startedAt ? formatDate(stream.startedAt) : "Just started"}</Badge>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/46">{stream.roomName}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{stream.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64">
                  Phase 1 exposes a preview surface with host details, recent chat, related rooms, and live ranking context.
                  Viewer transport and in-room messaging are intentionally deferred to the next phase.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Avatar name={stream.hostDisplayName} imageUrl={stream.avatarUrl} className="h-14 w-14" />
                <div>
                  <p className="text-lg font-semibold text-white">{stream.hostDisplayName}</p>
                  <p className="text-sm text-white/56">@{stream.hostUsername}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm text-white/68"><Users className="h-4 w-4" /> Current viewers</div>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(stream.viewerCount)}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm text-white/68"><Radio className="h-4 w-4" /> Peak viewers</div>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(stream.peakViewers)}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm text-white/68"><Flame className="h-4 w-4" /> Gift revenue</div>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(stream.giftRevenueCoins)}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm text-white/68"><MessageCircle className="h-4 w-4" /> Followers</div>
                <p className="mt-3 text-3xl font-semibold text-white">{formatNumber(stream.followerCount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
          <Card className="border-white/8 bg-white/4">
            <CardHeader>
              <CardTitle>Recent chat</CardTitle>
              <CardDescription>Public chat preview is read-only in this phase.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentChat.length > 0 ? (
                recentChat.map((message) => (
                  <div key={message.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{message.username}</p>
                      <span className="text-xs text-white/42">{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/64">{message.message}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/60">
                  No chat messages have been published yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-white/4">
            <CardHeader>
              <CardTitle>Related streams</CardTitle>
              <CardDescription>Rooms in the same category keep users moving through the lobby.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedStreams.length > 0 ? (
                relatedStreams.map((related) => <LiveStreamCard key={related.streamId} stream={related} />)
              ) : (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/60">
                  No related live rooms are available right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}