"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins, Crown, Flame, MessageCircle, Radio, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useAuthBridge } from "@/components/auth-bridge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { LiveStreamCard, type DiscoveryStreamCardData } from "@/features/discover/components/live-stream-card";
import { useLiveRoomSocket } from "../hooks/use-live-room-socket";

type ViewerRoomData = {
  stream: DiscoveryStreamCardData & {
    followerCount: number;
  };
  recentChat: Array<{
    id: string;
    userId?: string;
    username: string;
    message: string;
    createdAt: string;
    timestamp?: number;
  }>;
  relatedStreams: DiscoveryStreamCardData[];
  topSupporters: Array<{
    userId: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    totalCoins: number;
  }>;
  monetization: {
    gifts: Array<{
      id: string;
      displayName: string;
      catalogKey: string;
      coinPrice: number;
      diamondCredit: number;
    }>;
    coinPackages: Array<{
      id: string;
      title: string;
      coins: number;
      bonusCoins: number;
      price: number;
      priceDisplay: string;
      currency: string | null;
    }>;
  };
  liveConfig: {
    generatedAt: string;
    featureFlags: Array<{
      key: string;
      enabled: boolean;
      flagType: string;
    }>;
    pricingHighlights: Array<{
      ruleKey: string;
      price: unknown;
      currency: unknown;
      billingUnit: unknown;
    }>;
    uiLayoutHints: {
      chatEnabled: boolean;
      giftingEnabled: boolean;
      pkEnabled: boolean;
      callupsellEnabled: boolean;
      withdrawalsEnabled: boolean;
    };
  };
};

function RoomLoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[420px] w-full" />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  );
}

function LockedAction({ authAvailable, children }: { authAvailable: boolean; children: React.ReactNode }) {
  if (authAvailable) {
    return <SignInButton mode="modal">{children}</SignInButton>;
  }

  return children;
}

export function LiveRoomScreen({ streamId }: { streamId: string }) {
  const auth = useAuthBridge();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [giftStatus, setGiftStatus] = useState<string | null>(null);

  const roomQuery = trpc.live.getViewerRoom.useQuery({ streamId }, { retry: false });
  const roomData = roomQuery.data as ViewerRoomData | undefined;

  const walletQuery = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: auth.isSignedIn,
    retry: false,
  });

  const sendGiftMutation = trpc.gift.sendGift.useMutation({
    onSuccess: () => {
      setGiftStatus("Gift sent.");
      void walletQuery.refetch();
      void roomQuery.refetch();
    },
    onError: (error: unknown) => {
      setGiftStatus(error instanceof Error ? error.message : "Unable to send gift.");
    },
  });

  useEffect(() => {
    if (!auth.isSignedIn) {
      setSessionToken(null);
      return;
    }

    let cancelled = false;

    void auth.getToken().then((token) => {
      if (!cancelled) {
        setSessionToken(token);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [auth]);

  const socket = useLiveRoomSocket({
    authToken: sessionToken,
    roomId: streamId,
    initialMessages: roomData?.recentChat ?? [],
    initialViewerCount: roomData?.stream.viewerCount ?? 0,
  });

  const walletData = walletQuery.data as { coinBalance?: number; diamondBalance?: number } | undefined;
  const featureHints = roomData?.liveConfig.uiLayoutHints;
  const visibleGifts = roomData?.monetization.gifts.slice(0, 8) ?? [];
  const pricingSummary = useMemo(() => {
    return (roomData?.liveConfig.pricingHighlights ?? []).slice(0, 3).map((rule) => {
      const priceLabel = rule.price == null ? "dynamic" : String(rule.price);
      const currencyLabel = rule.currency ? String(rule.currency) : "config";
      const unitLabel = rule.billingUnit ? String(rule.billingUnit) : "rule";
      return `${rule.ruleKey}: ${priceLabel} ${currencyLabel} / ${unitLabel}`;
    });
  }, [roomData?.liveConfig.pricingHighlights]);

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <RoomLoadingState />
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-dashed border-white/12 bg-white/4">
            <CardContent className="space-y-4 p-8">
              <Badge variant="neutral" className="w-fit">Unavailable</Badge>
              <h1 className="text-2xl font-semibold text-white">This live room is no longer available</h1>
              <p className="max-w-2xl text-sm leading-7 text-white/62">
                The host may have ended the session, or the room may have been removed from the live feed.
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

  const { stream } = roomData;

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!featureHints?.chatEnabled) {
      setGiftStatus("Chat is disabled by remote config.");
      return;
    }

    const sent = socket.sendChatMessage(chatDraft);
    if (sent) {
      setChatDraft("");
      setGiftStatus(null);
    }
  }

  function handleQuickGift(giftId: string, giftName: string, giftCode: string) {
    if (!auth.isSignedIn) {
      setGiftStatus("Sign in to send gifts.");
      return;
    }

    if (!featureHints?.giftingEnabled) {
      setGiftStatus("Gifting is disabled by remote config.");
      return;
    }

    sendGiftMutation.mutate({
      giftId,
      receiverUserId: stream.hostUserId,
      contextType: "LIVE_STREAM",
      contextId: stream.streamId,
      quantity: 1,
    }, {
      onSuccess: () => {
        socket.emitGiftEvent({
          giftId,
          giftName,
          senderName: auth.userId ? `fan-${auth.userId.slice(0, 6)}` : "Fan",
          quantity: 1,
          effect: giftCode,
        });
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/discover" className="inline-flex items-center gap-2 text-sm text-white/62 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to discovery
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant={socket.connectionState === "connected" ? "live" : "neutral"}>{socket.connectionState}</Badge>
            <Link href="/admin/live">
              <Button variant="secondary" size="sm">Live ops</Button>
            </Link>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="overflow-hidden border-white/12 bg-[radial-gradient(circle_at_top_left,_rgba(255,107,61,0.18),_transparent_30%),linear-gradient(160deg,_rgba(8,12,30,0.96),_rgba(31,13,58,0.92)_55%,_rgba(10,58,78,0.82))]">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="live">Live</Badge>
                <Badge variant="hot">{stream.category}</Badge>
                <Badge>{featureHints?.giftingEnabled ? "Gifts on" : "Gifts off"}</Badge>
                <Badge>{featureHints?.chatEnabled ? "Chat on" : "Chat off"}</Badge>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.03))] p-5 sm:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,184,77,0.16),_transparent_35%)]" />
                <div className="relative flex min-h-[380px] flex-col justify-between">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-white/46">{stream.roomName}</p>
                      <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">{stream.title}</h1>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/25 px-4 py-3 text-right backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.24em] text-white/48">Live since</p>
                      <p className="mt-2 text-sm font-medium text-white">{stream.startedAt ? formatDate(stream.startedAt) : "Just started"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                        <Avatar name={stream.hostDisplayName} imageUrl={stream.avatarUrl} className="h-14 w-14" />
                        <div>
                          <p className="text-lg font-semibold text-white">{stream.hostDisplayName}</p>
                          <p className="text-sm text-white/54">@{stream.hostUsername}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/48"><Radio className="h-4 w-4" /> Live</div>
                          <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(socket.viewerCount)}</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/48"><Flame className="h-4 w-4" /> Peak</div>
                          <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(stream.peakViewers)}</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/48"><Coins className="h-4 w-4" /> Gifts</div>
                          <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(stream.giftRevenueCoins)}</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/48"><Sparkles className="h-4 w-4" /> Fans</div>
                          <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(stream.followerCount)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {socket.giftEvents.length > 0 ? socket.giftEvents.map((giftEvent, index) => (
                        <div key={`${giftEvent.deliveryId ?? giftEvent.giftName ?? "gift"}-${index}`} className="rounded-3xl border border-[#ffb84d]/18 bg-[rgba(255,184,77,0.08)] p-4 backdrop-blur-sm">
                          <p className="text-xs uppercase tracking-[0.22em] text-[#ffd89e]">Gift burst</p>
                          <p className="mt-2 text-sm font-medium text-white">
                            {giftEvent.senderName ?? "A fan"} sent {giftEvent.quantity ?? 1}x {giftEvent.giftName ?? "gift"}
                          </p>
                        </div>
                      )) : (
                        <div className="rounded-3xl border border-dashed border-white/12 bg-black/18 p-4 text-sm text-white/58">
                          Signed-in viewers receive live gift overlays and chat updates here.
                        </div>
                      )}

                      <div className="rounded-3xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/48">Pricing rules</p>
                        <div className="mt-3 space-y-2 text-sm text-white/64">
                          {pricingSummary.length > 0 ? pricingSummary.map((line) => (
                            <p key={line}>{line}</p>
                          )) : <p>No active pricing highlights were returned.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle>Viewer wallet</CardTitle>
                <CardDescription>Protected economy actions unlock from the current Clerk session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {auth.isSignedIn ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60"><Wallet className="h-4 w-4" /> Coins</div>
                      <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(Number(walletData?.coinBalance ?? 0))}</p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60"><Crown className="h-4 w-4" /> Diamonds</div>
                      <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(Number(walletData?.diamondBalance ?? 0))}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/62">
                    Sign in to load your wallet, send gifts, and join realtime chat.
                  </div>
                )}

                <div className="space-y-3">
                  {roomData.monetization.coinPackages.slice(0, 4).map((coinPackage) => (
                    <div key={coinPackage.id} className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div>
                        <p className="font-medium text-white">{coinPackage.title}</p>
                        <p className="text-sm text-white/56">{formatNumber(coinPackage.coins)} coins</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">{coinPackage.priceDisplay}</p>
                        <p className="text-xs text-white/42">{formatCurrency(coinPackage.price, String(coinPackage.currency ?? "USD"))}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {!auth.isSignedIn ? (
                  <LockedAction authAvailable={auth.clerkAvailable}>
                    <Button className="w-full">Sign in for wallet access</Button>
                  </LockedAction>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr_0.72fr]">
          <Card className="border-white/8 bg-white/4">
            <CardHeader>
              <CardTitle>Realtime chat</CardTitle>
              <CardDescription>{featureHints?.chatEnabled ? "Socket-backed chat is enabled for signed-in viewers." : "Chat is disabled by remote config."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {socket.messages.length > 0 ? socket.messages.map((message) => (
                  <div key={message.id} className="rounded-3xl border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{message.username}</p>
                      <span className="text-xs text-white/40">{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/66">{message.message}</p>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/60">
                    No chat messages yet.
                  </div>
                )}
              </div>

              <form className="space-y-3" onSubmit={handleChatSubmit}>
                <textarea
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder={auth.isSignedIn ? "Type a message for the room" : "Sign in to chat"}
                  disabled={!auth.isSignedIn || !featureHints?.chatEnabled}
                  className="min-h-28 w-full rounded-[28px] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/34 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {auth.isSignedIn ? (
                  <Button type="submit" className="w-full" disabled={!featureHints?.chatEnabled || chatDraft.trim().length === 0}>Send message</Button>
                ) : (
                  <LockedAction authAvailable={auth.clerkAvailable}>
                    <Button type="button" className="w-full">Sign in to chat</Button>
                  </LockedAction>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle>Gift tray</CardTitle>
                <CardDescription>Catalog and gift pricing are loaded from the existing creator economy backend.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {visibleGifts.map((gift) => (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => handleQuickGift(gift.id, gift.displayName, gift.catalogKey)}
                    disabled={!auth.isSignedIn || !featureHints?.giftingEnabled || sendGiftMutation.isPending}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-4 text-left transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="text-2xl">{gift.catalogKey.slice(0, 2).toUpperCase()}</div>
                    <p className="mt-4 font-medium text-white">{gift.displayName}</p>
                    <p className="mt-1 text-sm text-white/56">{formatNumber(gift.coinPrice)} coins</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#ffd89e]">+{formatNumber(gift.diamondCredit)} diamonds</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle>Related rooms</CardTitle>
                <CardDescription>Keep viewers moving through the live graph without bouncing back to a blank page.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {roomData.relatedStreams.length > 0 ? roomData.relatedStreams.map((related) => (
                  <LiveStreamCard key={related.streamId} stream={related} />
                )) : (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/60">
                    No related streams are live right now.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle>Top supporters</CardTitle>
                <CardDescription>Live-room economy ranking based on historical gift spend in this stream context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roomData.topSupporters.length > 0 ? roomData.topSupporters.map((supporter, index) => (
                  <div key={supporter.userId} className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/4 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-white">{index + 1}</div>
                    <Avatar name={supporter.displayName ?? supporter.username ?? "Fan"} imageUrl={supporter.avatarUrl} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{supporter.displayName ?? supporter.username ?? "Fan"}</p>
                      <p className="truncate text-xs text-white/46">{formatNumber(supporter.totalCoins)} coins</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-5 text-sm text-white/60">
                    No gift transactions yet in this room.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle>Control plane</CardTitle>
                <CardDescription>The room respects remote config instead of hardcoding monetization and feature state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/68">
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2 text-white"><ShieldCheck className="h-4 w-4" /> Feature gates</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roomData.liveConfig.featureFlags.slice(0, 8).map((flag) => (
                      <Badge key={flag.key} variant={flag.enabled ? "live" : "neutral"}>{flag.key}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2 text-white"><MessageCircle className="h-4 w-4" /> Room switches</div>
                  <p className="mt-3 leading-7">
                    Chat: {featureHints?.chatEnabled ? "enabled" : "disabled"} · Gifts: {featureHints?.giftingEnabled ? "enabled" : "disabled"} · PK: {featureHints?.pkEnabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2 text-white"><Crown className="h-4 w-4" /> Economy rails</div>
                  <p className="mt-3 leading-7">
                    Call upsell: {featureHints?.callupsellEnabled ? "enabled" : "disabled"} · Withdrawals: {featureHints?.withdrawalsEnabled ? "enabled" : "disabled"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {giftStatus ? (
          <div className="fixed bottom-4 left-1/2 z-20 w-[min(92vw,560px)] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(5,8,22,0.92)] px-5 py-3 text-sm text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {giftStatus}
          </div>
        ) : null}
      </div>
    </div>
  );
}