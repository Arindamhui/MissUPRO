import Link from "next/link";
import { Flame, Radio, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

export interface DiscoveryStreamCardData {
  streamId: string;
  roomId: string;
  hostUserId: string;
  title: string;
  roomName: string;
  category: string;
  hostDisplayName: string;
  hostUsername: string;
  avatarUrl: string | null;
  viewerCount: number;
  peakViewers: number;
  giftRevenueCoins: number;
  startedAt: string | null;
  trendingScore: number;
}

const categoryThemes: Record<string, string> = {
  Music: "from-[#3b1d7a] via-[#6d2ec8] to-[#f04f7a]",
  Chat: "from-[#0d3b66] via-[#177e89] to-[#ffc857]",
  Dance: "from-[#5f0f40] via-[#9a031e] to-[#fb8b24]",
  Gaming: "from-[#0f172a] via-[#1d4ed8] to-[#22d3ee]",
};

function getCardTheme(category: string) {
  return categoryThemes[category] ?? "from-[#22113d] via-[#0d4c6d] to-[#ff6b3d]";
}

export function LiveStreamCard({ stream }: { stream: DiscoveryStreamCardData }) {
  return (
    <Link href={`/discover/${stream.streamId}`} className="block">
      <Card className="overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:border-white/18">
        <div className={cn("relative min-h-[208px] bg-gradient-to-br p-5", getCardTheme(stream.category))}>
          <div className="flex items-start justify-between gap-3">
            <Badge variant="live">Live</Badge>
            <div className="rounded-full bg-black/18 px-3 py-1 text-xs font-medium text-white/86 backdrop-blur-sm">
              {stream.category}
            </div>
          </div>

          <div className="mt-14 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/72">{stream.roomName}</p>
              <h3 className="mt-2 max-w-[14rem] text-xl font-semibold leading-tight text-white">{stream.title}</h3>
            </div>
            <div className="rounded-2xl bg-black/18 px-3 py-2 text-right text-white backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/68">Coins</p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(stream.giftRevenueCoins)}</p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={stream.hostDisplayName} imageUrl={stream.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{stream.hostDisplayName}</p>
              <p className="truncate text-xs text-white/54">@{stream.hostUsername}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left text-xs text-white/62">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-1 text-white/72">
                <Users className="h-3.5 w-3.5" />
                <span>Now</span>
              </div>
              <p className="mt-2 text-base font-semibold text-white">{formatNumber(stream.viewerCount)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-1 text-white/72">
                <Radio className="h-3.5 w-3.5" />
                <span>Peak</span>
              </div>
              <p className="mt-2 text-base font-semibold text-white">{formatNumber(stream.peakViewers)}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-1 text-white/72">
                <Flame className="h-3.5 w-3.5" />
                <span>Heat</span>
              </div>
              <p className="mt-2 text-base font-semibold text-white">{stream.trendingScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50">
            <span>
              {stream.startedAt
                ? `Started ${formatDistanceToNow(new Date(stream.startedAt), { addSuffix: true })}`
                : "Starting soon"}
            </span>
            <span className="text-white/76">Open preview</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}