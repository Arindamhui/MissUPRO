import { MaterialCommunityIcons } from "@expo/vector-icons";

export type LeaderboardEntry = {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  rank?: number;
  rankPosition?: number;
  score?: number;
  scoreValue?: number;
  scoreDelta?: number | string;
  snapshotAt?: string | Date;
};

export type Leaderboard = {
  id: string;
  title?: string;
  leaderboardType?: string;
  scoringMetric?: string;
  windowType?: string;
  status?: string;
  updatedAt?: string | Date;
};

export type LeaderboardConfig = {
  configKey?: string;
  leaderboardType?: string;
  scoringMetric?: string;
  isActive?: boolean;
  status?: string;
};

export type CardPreset = {
  key: string;
  title: string;
  accent?: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  colors: [string, string];
  layout: "hero" | "small" | "wide" | "tall";
  tokens: string[];
  detailVariant: "podium" | "weekly" | "record" | "combo" | "game";
  tabs: string[];
};

export type ShowcaseCard = {
  preset: CardPreset;
  board: Leaderboard | null;
  config: LeaderboardConfig | null;
  enabled: boolean;
};

export const CARD_PRESETS: CardPreset[] = [
  {
    key: "top-users",
    title: "Top Users",
    accent: "Daily",
    subtitle: "Daily ranking",
    icon: "account-group",
    colors: ["#6D2CFF", "#4C2AD5"],
    layout: "hero",
    tokens: ["top user", "daily", "gift_coins_received", "received"],
    detailVariant: "podium",
    tabs: ["Daily", "7 Days", "30 Days", "Total"],
  },
  {
    key: "top-talents",
    title: "Top Talents",
    subtitle: "Top host power",
    icon: "microphone",
    colors: ["#B45918", "#6A280C"],
    layout: "small",
    tokens: ["talent", "host", "creator", "received"],
    detailVariant: "podium",
    tabs: ["Daily", "7 Days", "30 Days", "Total"],
  },
  {
    key: "new-star",
    title: "New Star",
    subtitle: "Fresh growth",
    icon: "star-four-points",
    colors: ["#355BFF", "#223788"],
    layout: "small",
    tokens: ["new", "rookie", "rising", "fresh"],
    detailVariant: "podium",
    tabs: ["Daily", "7 Days", "30 Days", "Total"],
  },
  {
    key: "weekly-star",
    title: "Weekly Star",
    subtitle: "Weekly crown",
    icon: "gift-outline",
    colors: ["#B3145B", "#7A0D45"],
    layout: "wide",
    tokens: ["weekly", "week", "star"],
    detailVariant: "weekly",
    tabs: ["Weekly", "Last Week"],
  },
  {
    key: "record-breaker",
    title: "Record Breaker",
    subtitle: "Best score",
    icon: "flag-variant",
    colors: ["#2C365C", "#1C2240"],
    layout: "small",
    tokens: ["record", "score", "best", "sent"],
    detailVariant: "record",
    tabs: ["Records"],
  },
  {
    key: "combo",
    title: "Combos",
    subtitle: "Sent to",
    icon: "cards-heart",
    colors: ["#A34A16", "#6E2806"],
    layout: "tall",
    tokens: ["combo", "pair", "send", "sent"],
    detailVariant: "combo",
    tabs: ["7 days", "30 days", "Total"],
  },
  {
    key: "game",
    title: "Game",
    subtitle: "Gaming room",
    icon: "controller",
    colors: ["#3348D9", "#182860"],
    layout: "small",
    tokens: ["game", "gaming", "play"],
    detailVariant: "game",
    tabs: ["TriMela", "Cricket Stars"],
  },
];

export const PREVIEW_NAMES: Record<string, string[]> = {
  "top-users": ["Murtaza", "Zaviyar", "Sorry"],
  "top-talents": ["RST", "Muzamil", "ShaNzy"],
  "new-star": ["Abdul", "King of Sk", "Nizamuddin"],
  "weekly-star": ["Aeroplane", "Rocket", "Fairy Peacock", "Kiss", "Fireworks", "Lucky Rabbit"],
  "record-breaker": ["2500", "120", "10104", "5060"],
  combo: ["SK king", "Priya", "Akash", "PSheh", "Always for Sweetie", "Sunshine"],
  game: ["Aryan", "Boy", "Boy", "Boy", "K"],
};

export function getInitials(value?: string) {
  const words = String(value ?? "User")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "U";
}

export function formatScore(value?: number | string) {
  const numericValue = Number(value ?? 0);
  if (numericValue >= 1000000) return `${(numericValue / 1000000).toFixed(1)}M`;
  if (numericValue >= 1000) return `${(numericValue / 1000).toFixed(numericValue >= 10000 ? 0 : 1)}K`;
  return `${Math.round(numericValue)}`;
}

export function formatWindowType(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Live board";
  if (normalized === "daily") return "Daily window";
  if (normalized === "weekly") return "Weekly window";
  if (normalized === "monthly") return "Monthly window";
  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)} window`;
}

export function normalizeTokens(...values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getFlagKey(flag: any) {
  return String(flag?.flagKey ?? flag?.flag_key ?? flag?.featureName ?? flag?.feature_name ?? "");
}

export function buildPreviewEntries(cardKey: string, fallbackTitle: string, liveEntries?: LeaderboardEntry[]) {
  if (liveEntries && liveEntries.length > 0) {
    return liveEntries.slice(0, cardKey === "combo" ? 6 : cardKey === "weekly-star" ? 6 : 8);
  }

  return (PREVIEW_NAMES[cardKey] ?? [fallbackTitle, `${fallbackTitle} Two`, `${fallbackTitle} Three`]).map((label, index) => ({
    userId: `${cardKey}-preview-${index}`,
    displayName: cardKey === "record-breaker" ? `${fallbackTitle} ${index + 1}` : label,
    scoreValue: cardKey === "record-breaker" ? Number(label) : (index + 1) * 1250,
    rankPosition: index + 1,
  }));
}

export function mapBoardsToPresets(boards: Leaderboard[]) {
  const assignment = new Map<string, Leaderboard>();
  const remainingBoards = [...boards];

  for (const preset of CARD_PRESETS) {
    let bestIndex = -1;
    let bestScore = -1;

    remainingBoards.forEach((board, index) => {
      const haystack = normalizeTokens(board.title, board.leaderboardType, board.windowType, board.scoringMetric);
      const score = preset.tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      const [board] = remainingBoards.splice(bestIndex, 1);
      if (board) assignment.set(preset.key, board);
    }
  }

  CARD_PRESETS.forEach((preset) => {
    if (!assignment.has(preset.key) && remainingBoards.length > 0) {
      const board = remainingBoards.shift();
      if (board) assignment.set(preset.key, board);
    }
  });

  return assignment;
}

export function mapConfigsToPresets(configs: LeaderboardConfig[]) {
  const assignment = new Map<string, LeaderboardConfig>();
  const remainingConfigs = [...configs];

  for (const preset of CARD_PRESETS) {
    const index = remainingConfigs.findIndex((config) => {
      const haystack = normalizeTokens(config.configKey, config.leaderboardType, config.scoringMetric);
      return preset.tokens.some((token) => haystack.includes(token));
    });

    if (index >= 0) {
      const [config] = remainingConfigs.splice(index, 1);
      if (config) assignment.set(preset.key, config);
    }
  }

  CARD_PRESETS.forEach((preset) => {
    if (!assignment.has(preset.key) && remainingConfigs.length > 0) {
      const config = remainingConfigs.shift();
      if (config) assignment.set(preset.key, config);
    }
  });

  return assignment;
}

export function resolvePreset(key?: string) {
  return CARD_PRESETS.find((preset) => preset.key === key) ?? CARD_PRESETS[0];
}