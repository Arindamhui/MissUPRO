import React, { useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Avatar, Badge, Button, Card, CoinDisplay, DiamondDisplay, Input, Screen, SectionHeader } from "@/components/ui";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";
import { useWalletStore } from "@/store";

type Person = {
  id: string;
  name: string;
  subtitle: string;
  tag?: string;
  online?: boolean;
};

const demoModels: Person[] = [
  { id: "aria", name: "Aria Flame", subtitle: "Music rooms and high-energy live nights", tag: "Top host", online: true },
  { id: "nova", name: "Nova Jade", subtitle: "Premium video sessions and gifting streaks", tag: "Trending", online: true },
  { id: "zuri", name: "Zuri K", subtitle: "Late-night chill chat and VIP lounge", tag: "New", online: false },
  { id: "maya", name: "Maya Lux", subtitle: "PK specialist with strong agency backing", tag: "PK pro", online: true },
];

const demoFollowers: Person[] = [
  { id: "f1", name: "Karan", subtitle: "Follows 18 creators", online: true },
  { id: "f2", name: "Jiya", subtitle: "Diamond spender this week", online: false },
  { id: "f3", name: "Rahul", subtitle: "VIP tier silver", online: true },
  { id: "f4", name: "Noor", subtitle: "Active in party rooms", online: true },
];

const demoMessages = [
  { id: "m1", name: "Aria Flame", preview: "Live started. Join the room?", time: "2m", unread: 3, online: true },
  { id: "m2", name: "Ops Desk", preview: "Your withdraw request moved to review.", time: "14m", unread: 0, online: false },
  { id: "m3", name: "Nova Jade", preview: "That PK rematch is happening tonight.", time: "1h", unread: 1, online: true },
];

const demoTransactions = [
  { id: "t1", label: "Coin purchase", date: "Today", amount: "+2200 coins", tone: COLORS.success },
  { id: "t2", label: "Video call billing", date: "Today", amount: "-400 coins", tone: COLORS.danger },
  { id: "t3", label: "Gift received", date: "Yesterday", amount: "+180 diamonds", tone: COLORS.primary },
  { id: "t4", label: "Withdrawal requested", date: "Yesterday", amount: "-900 diamonds", tone: COLORS.warning },
];

const demoGifts = [
  { id: "g1", emoji: "🌹", name: "Rose Burst", price: 29 },
  { id: "g2", emoji: "🚀", name: "Booster", price: 99 },
  { id: "g3", emoji: "👑", name: "Crown", price: 199 },
  { id: "g4", emoji: "🛥", name: "Yacht", price: 499 },
  { id: "g5", emoji: "🦄", name: "Unicorn", price: 899 },
  { id: "g6", emoji: "🌌", name: "Galaxy Drop", price: 1299 },
];

const demoViewers = [
  { id: "v1", name: "Sana", spend: "2.4k coins" },
  { id: "v2", name: "Dev", spend: "1.1k coins" },
  { id: "v3", name: "Aisha", spend: "VIP Gold" },
  { id: "v4", name: "Vikram", spend: "Agency scout" },
];

const adminFlags = [
  { key: "new-pk-engine", type: "percentage rollout", value: "45%", state: "Active" },
  { key: "creator-layout-v3", type: "user list", value: "820 users", state: "Draft" },
  { key: "safe-wallet-limits", type: "boolean", value: "On", state: "Active" },
];

const adminLayouts = [
  { name: "home_feed_default", version: "v12", target: "mobile/all", state: "Published" },
  { name: "wallet_growth_push", version: "v3", target: "mobile/in", state: "Draft" },
  { name: "creator_hub_agency", version: "v5", target: "mobile/global", state: "Review" },
];

function Shell({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Screen scroll>
      <View style={{ marginBottom: SPACING.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT.sizes.title, fontWeight: "800", color: COLORS.text }}>{title}</Text>
            {subtitle ? (
              <Text style={{ fontSize: FONT.sizes.md, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>
            ) : null}
          </View>
          {right}
        </View>
      </View>
      {children}
    </Screen>
  );
}

function HeroCard({ eyebrow, title, body, actions }: { eyebrow: string; title: string; body: string; actions?: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#0E1325",
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: "rgba(108,92,231,0.18)",
      }}
    >
      <Text style={{ color: "#9FB0FF", fontSize: FONT.sizes.sm, fontWeight: "700", letterSpacing: 1 }}>{eyebrow.toUpperCase()}</Text>
      <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "800", marginTop: 10, lineHeight: 34 }}>{title}</Text>
      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 10, fontSize: FONT.sizes.md, lineHeight: 21 }}>{body}</Text>
      {actions ? <View style={{ marginTop: SPACING.lg, gap: SPACING.sm }}>{actions}</View> : null}
    </View>
  );
}

function StatsRow({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg, flexWrap: "wrap" }}>
      {items.map((item) => (
        <Card key={item.label} style={{ flexGrow: 1, minWidth: "30%" as any, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text }}>{item.value}</Text>
          <Text style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginTop: 4 }}>{item.label}</Text>
        </Card>
      ))}
    </View>
  );
}

function QuickLinkGrid({ items }: { items: Array<{ label: string; icon: string; href: string }> }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.lg }}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.label}
          onPress={() => router.push(item.href as never)}
          style={{
            width: "48%",
            backgroundColor: COLORS.card,
            borderRadius: RADIUS.lg,
            padding: SPACING.md,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
          <Text style={{ fontSize: FONT.sizes.lg, fontWeight: "700", color: COLORS.text, marginTop: 10 }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PersonRow({ person, trailing, onPress }: { person: Person; trailing?: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
        <Avatar size={54} online={person.online} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT.sizes.lg, fontWeight: "700", color: COLORS.text }}>{person.name}</Text>
          <Text style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginTop: 3 }}>{person.subtitle}</Text>
          {person.tag ? <View style={{ marginTop: 8, alignSelf: "flex-start" }}><Badge text={person.tag} color={COLORS.primary} /></View> : null}
        </View>
        {trailing}
      </Card>
    </TouchableOpacity>
  );
}

function TagRow({ tags }: { tags: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        {tags.map((tag) => (
          <View key={tag} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surface }}>
            <Text style={{ color: COLORS.text, fontWeight: "600", fontSize: FONT.sizes.sm }}>{tag}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function RegisterCatalogScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  return (
    <Shell title="Register" subtitle="Create a fan, creator, or operator account with referral onboarding.">
      <HeroCard
        eyebrow="Growth"
        title="Create one account, then shape the journey later."
        body="This screen is optimized for fast onboarding, referral capture, and clean handoff into OTP or email verification."
      />
      <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How you appear in rooms" />
      <Input label="Email or phone" value={email} onChangeText={setEmail} placeholder="creator@missu.app or +91..." />
      <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
      <Input label="Referral code" value={referralCode} onChangeText={setReferralCode} placeholder="Optional" />
      <View style={{ gap: SPACING.sm }}>
        <Button title="Create account" onPress={() => router.push("/(auth)/otp-verify" as never)} />
        <Button title="Continue with Google" variant="outline" onPress={() => undefined} />
      </View>
    </Shell>
  );
}

export function OtpVerifyCatalogScreen() {
  const [code, setCode] = useState("");

  return (
    <Shell title="OTP Verify" subtitle="Short-code verification for phone, recovery, or high-risk actions.">
      <HeroCard
        eyebrow="Trust"
        title="Fast verification with fallback recovery."
        body="Supports resend countdown, alternate channels, and clear context for auth, payout, and security prompts."
      />
      <Card>
        <Text style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary }}>Code sent to</Text>
        <Text style={{ fontSize: FONT.sizes.lg, fontWeight: "700", color: COLORS.text, marginTop: 4 }}>+91 98XXX XX210</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="Enter 6-digit code"
          placeholderTextColor={COLORS.textSecondary}
          style={{
            marginTop: SPACING.md,
            backgroundColor: COLORS.inputBg,
            borderRadius: RADIUS.lg,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.md,
            fontSize: 24,
            letterSpacing: 10,
            color: COLORS.text,
            textAlign: "center",
          }}
        />
      </Card>
      <View style={{ gap: SPACING.sm }}>
        <Button title="Verify and continue" onPress={() => router.replace("/(tabs)" as never)} />
        <Button title="Resend code in 19s" variant="ghost" onPress={() => undefined} />
      </View>
    </Shell>
  );
}

export function HomeFeedCatalogScreen() {
  const coins = useWalletStore((state) => state.coinBalance || 1280);

  return (
    <Shell
      title="Home Feed"
      subtitle="Personalized discovery across live rooms, featured models, promos, and admin-published UI sections."
      right={<TouchableOpacity onPress={() => router.push("/wallet" as never)}><CoinDisplay amount={coins} size="sm" /></TouchableOpacity>}
    >
      <HeroCard
        eyebrow="For you"
        title="Tonight is tuned for high-retention viewers."
        body="Discovery blends recommended models, agency pushes, season campaigns, and active room heat into one modular feed."
        actions={<Button title="Open trending live" onPress={() => router.push("/home/trending-live" as never)} />}
      />
      <QuickLinkGrid
        items={[
          { label: "Trending Live", icon: "📺", href: "/home/trending-live" },
          { label: "Recommended Models", icon: "✨", href: "/home/recommended-models" },
          { label: "Wallet", icon: "🪙", href: "/wallet/purchase" },
          { label: "Agency", icon: "🏢", href: "/agency/dashboard" },
        ]}
      />
      <SectionHeader title="Recommended now" />
      {demoModels.slice(0, 3).map((person) => (
        <PersonRow key={person.id} person={person} onPress={() => router.push(`/profile/${person.id}` as never)} trailing={<Text style={{ color: COLORS.primary }}>›</Text>} />
      ))}
    </Shell>
  );
}

export function TrendingLiveCatalogScreen() {
  return (
    <Shell title="Trending Live" subtitle="Heat-ranked live rooms with viewer spikes, gifting momentum, and PK activity.">
      <TagRow tags={["All", "PK", "Music", "Party", "High spend", "Agencies"]} />
      {demoModels.map((person, index) => (
        <Card key={person.id} style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ height: 180, backgroundColor: index % 2 === 0 ? "#171B35" : "#2B193A", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 52 }}>📺</Text>
            <View style={{ position: "absolute", top: 14, left: 14 }}><Badge text="LIVE" color={COLORS.danger} /></View>
            <View style={{ position: "absolute", top: 14, right: 14 }}><Badge text={`${1400 - index * 120} watching`} color={COLORS.success} /></View>
          </View>
          <View style={{ padding: SPACING.md }}>
            <Text style={{ fontSize: FONT.sizes.lg, fontWeight: "700", color: COLORS.text }}>{person.name}</Text>
            <Text style={{ marginTop: 4, color: COLORS.textSecondary }}>{person.subtitle}</Text>
            <View style={{ marginTop: SPACING.md, flexDirection: "row", gap: SPACING.sm }}>
              <Button title="Enter room" size="sm" onPress={() => router.push(`/live/room/${person.id}` as never)} style={{ flex: 1 }} />
              <Button title="Profile" size="sm" variant="outline" onPress={() => router.push(`/profile/${person.id}` as never)} style={{ flex: 1 }} />
            </View>
          </View>
        </Card>
      ))}
    </Shell>
  );
}

export function RecommendedModelsCatalogScreen() {
  return (
    <Shell title="Recommended Models" subtitle="Ranking blends watch history, level affinity, language, and region-aware inventory.">
      <StatsRow items={[{ label: "High match", value: "12" }, { label: "Online now", value: "7" }, { label: "New creators", value: "4" }]} />
      {demoModels.map((person) => (
        <PersonRow
          key={person.id}
          person={person}
          onPress={() => router.push(`/profile/${person.id}` as never)}
          trailing={<Button title="View" size="sm" variant="outline" onPress={() => router.push(`/profile/${person.id}` as never)} />}
        />
      ))}
    </Shell>
  );
}

export function LiveRoomCatalogScreen({ roomId }: { roomId?: string }) {
  return (
    <Shell title="Live Room" subtitle={`Room ${roomId ?? "demo-room"} with stream, chat, gifting, and viewer controls in one session.`}>
      <HeroCard
        eyebrow="Live"
        title="Host camera, overlays, gifting lane, and viewer telemetry."
        body="This screen is the playback surface. The related chat, gifts, and viewer list screens are exposed as focused drill-down surfaces for mobile flows."
        actions={
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button title="Live Chat" size="sm" onPress={() => router.push("/live/chat" as never)} style={{ flex: 1 }} />
            <Button title="Gift Panel" size="sm" variant="outline" onPress={() => router.push("/live/gift-panel" as never)} style={{ flex: 1 }} />
          </View>
        }
      />
      <StatsRow items={[{ label: "Viewers", value: "1.2k" }, { label: "Gifts/min", value: "46" }, { label: "PK score", value: "820" }]} />
      <Button title="Open viewer list" variant="secondary" onPress={() => router.push("/live/viewer-list" as never)} />
    </Shell>
  );
}

export function LiveChatCatalogScreen() {
  const [message, setMessage] = useState("");

  return (
    <Shell title="Live Chat" subtitle="Pinned notices, moderation actions, and high-volume room comments.">
      <Card style={{ backgroundColor: "#101422" }}>
        {[
          "Host: Welcome to the late-night PK warmup.",
          "Maya: Send crowns if you want a rematch.",
          "System: Slow mode is active for the next 30 seconds.",
        ].map((entry) => (
          <Text key={entry} style={{ color: COLORS.white, marginBottom: 12 }}>{entry}</Text>
        ))}
      </Card>
      <Card>
        <Text style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary, marginBottom: 8 }}>Reply into the room</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Say something useful"
          placeholderTextColor={COLORS.textSecondary}
          style={{ backgroundColor: COLORS.inputBg, borderRadius: RADIUS.lg, padding: SPACING.md, color: COLORS.text }}
        />
      </Card>
      <Button title="Send message" onPress={() => setMessage("")} />
    </Shell>
  );
}

export function GiftPanelCatalogScreen() {
  return (
    <Shell title="Gift Panel" subtitle="Fast gifting surface with price tiers, burst combos, and wallet awareness." right={<CoinDisplay amount={4820} size="sm" />}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {demoGifts.map((gift) => (
          <TouchableOpacity key={gift.id} style={{ width: "31%", backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: "center", borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ fontSize: 32 }}>{gift.emoji}</Text>
            <Text style={{ marginTop: 8, fontWeight: "700", color: COLORS.text }}>{gift.name}</Text>
            <Text style={{ color: COLORS.primary, marginTop: 4 }}>{gift.price} coins</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ marginTop: SPACING.lg, gap: SPACING.sm }}>
        <Button title="Send selected gift" onPress={() => undefined} />
        <Button title="Open transaction history" variant="outline" onPress={() => router.push("/wallet/history" as never)} />
      </View>
    </Shell>
  );
}

export function ViewerListCatalogScreen() {
  return (
    <Shell title="Viewer List" subtitle="Top spenders, supporters, and live moderators in the room.">
      {demoViewers.map((viewer, index) => (
        <Card key={viewer.id} style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
          <View style={{ width: 34, alignItems: "center" }}><Text style={{ color: COLORS.textSecondary, fontWeight: "700" }}>#{index + 1}</Text></View>
          <Avatar size={48} online />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: COLORS.text }}>{viewer.name}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>{viewer.spend}</Text>
          </View>
          <Button title="Profile" size="sm" variant="outline" onPress={() => router.push(`/profile/${viewer.id}` as never)} />
        </Card>
      ))}
    </Shell>
  );
}

export function PkBattleCatalogScreen() {
  return (
    <Shell title="PK Battle Screen" subtitle="Two-host match with timer, score lanes, and momentum indicators.">
      <HeroCard eyebrow="PK" title="Maya Lux vs Nova Jade" body="Gifts convert into live score. Viewer lane badges and swing alerts keep the match readable on mobile." />
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
        <Card style={{ flex: 1, alignItems: "center", backgroundColor: "#1B2A54" }}>
          <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xl, fontWeight: "800" }}>8,420</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Maya Lux</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center", backgroundColor: "#4A1F42" }}>
          <Text style={{ color: COLORS.white, fontSize: FONT.sizes.xl, fontWeight: "800" }}>7,980</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Nova Jade</Text>
        </Card>
      </View>
      <Button title="View PK results" onPress={() => router.push("/pk/results" as never)} />
    </Shell>
  );
}

export function PkResultsCatalogScreen() {
  return (
    <Shell title="PK Results" subtitle="Post-match summary for hosts, viewers, and agency analysts.">
      <HeroCard eyebrow="Result" title="Maya Lux wins by 440 points" body="Reward split, top gifters, and replay highlights are available from the same summary surface." />
      <StatsRow items={[{ label: "Total gifts", value: "362" }, { label: "Top supporter", value: "Aisha" }, { label: "Reward pool", value: "12k" }]} />
    </Shell>
  );
}

export function CallRequestCatalogScreen() {
  return (
    <Shell title="Call Request" subtitle="Pre-call intent screen with rate, balance impact, and availability checks.">
      <HeroCard eyebrow="Calls" title="Start with context before the meter starts." body="Users see estimated burn, creator rate, expected wait, and whether they are opening audio or video." />
      <Card>
        <Text style={{ fontWeight: "700", color: COLORS.text }}>Nova Jade</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>Audio: 45 coins/min | Video: 75 coins/min</Text>
        <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
          <Button title="Request audio call" onPress={() => router.push("/calls/audio" as never)} />
          <Button title="Request video call" variant="outline" onPress={() => router.push("/calls/video" as never)} />
        </View>
      </Card>
    </Shell>
  );
}

function CallStage({ title, mode }: { title: string; mode: "audio" | "video" }) {
  return (
    <Shell title={title} subtitle={`${mode === "audio" ? "Audio" : "Video"} calling surface with live controls and low-balance visibility.`}>
      <HeroCard eyebrow="In session" title={`Connected to ${mode === "audio" ? "Aria Flame" : "Nova Jade"}`} body="RTC surface, billing state, and gifting shortcut stay visible without overwhelming the active call UI." />
      <StatsRow items={[{ label: "Duration", value: "06:24" }, { label: "Rate", value: mode === "audio" ? "45/min" : "75/min" }, { label: "Balance", value: "1.8k" }]} />
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <Button title="Mute" variant="secondary" onPress={() => undefined} style={{ flex: 1 }} />
        <Button title="Gift" variant="outline" onPress={() => router.push("/live/gift-panel" as never)} style={{ flex: 1 }} />
        <Button title="End" variant="danger" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </Shell>
  );
}

export function AudioCallCatalogScreen() {
  return <CallStage title="Audio Call" mode="audio" />;
}

export function VideoCallCatalogScreen() {
  return <CallStage title="Video Call" mode="video" />;
}

export function ConversationListCatalogScreen() {
  return (
    <Shell title="Conversation List" subtitle="Direct messages, system notices, and pinned support threads in one inbox.">
      {demoMessages.map((message) => (
        <TouchableOpacity key={message.id} onPress={() => router.push(`/chat/${message.id}` as never)}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <Avatar size={52} online={message.online} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: FONT.sizes.lg, fontWeight: "700", color: COLORS.text }}>{message.name}</Text>
                <Text style={{ color: COLORS.textSecondary }}>{message.time}</Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{message.preview}</Text>
            </View>
            {message.unread > 0 ? <Badge text={`${message.unread}`} color={COLORS.primary} /> : null}
          </Card>
        </TouchableOpacity>
      ))}
    </Shell>
  );
}

export function CoinPurchaseCatalogScreen() {
  return (
    <Shell title="Coin Purchase" subtitle="Monetization purchase screen with bundles, wallet summary, and store handoff." right={<DiamondDisplay amount={320} size="sm" />}>
      <StatsRow items={[{ label: "Coins", value: "4.8k" }, { label: "Diamonds", value: "320" }, { label: "Bonus", value: "+18%" }]} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {[499, 999, 1999, 4999, 9999, 14999].map((coins, index) => (
          <Card key={coins} style={{ width: "31%", alignItems: "center", borderWidth: index === 2 ? 2 : 1, borderColor: index === 2 ? COLORS.primary : COLORS.border }}>
            <Text style={{ fontSize: 28 }}>🪙</Text>
            <Text style={{ fontWeight: "800", color: COLORS.text, marginTop: 8 }}>{coins.toLocaleString()}</Text>
            <Text style={{ color: COLORS.primary, marginTop: 4 }}>Rs. {(coins / 10).toFixed(0)}</Text>
          </Card>
        ))}
      </View>
      <View style={{ marginTop: SPACING.lg, gap: SPACING.sm }}>
        <Button title="Continue to purchase" onPress={() => undefined} />
        <Button title="Open transaction history" variant="outline" onPress={() => router.push("/wallet/history" as never)} />
      </View>
    </Shell>
  );
}

export function TransactionHistoryCatalogScreen() {
  return (
    <Shell title="Transaction History" subtitle="Unified view across coin purchases, gifting, billing, and withdrawals.">
      {demoTransactions.map((item) => (
        <Card key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontWeight: "700", color: COLORS.text }}>{item.label}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 3 }}>{item.date}</Text>
          </View>
          <Text style={{ color: item.tone, fontWeight: "700" }}>{item.amount}</Text>
        </Card>
      ))}
    </Shell>
  );
}

export function UserProfileCatalogScreen({ userId }: { userId?: string }) {
  return (
    <Shell title="User Profile" subtitle={`Profile surface for ${userId ?? "current user"} with calls, chat, follow graph, and economy context.`}>
      <View style={{ alignItems: "center", marginBottom: SPACING.lg }}>
        <Avatar size={96} online />
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, marginTop: SPACING.md }}>Aria Flame</Text>
        <Text style={{ color: COLORS.textSecondary, textAlign: "center", marginTop: 6 }}>Daily live host, gifting magnet, and agency captain for weekend PK battles.</Text>
      </View>
      <StatsRow items={[{ label: "Followers", value: "28.4k" }, { label: "Following", value: "321" }, { label: "Level", value: "48" }]} />
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
        <Button title="Edit profile" variant="secondary" onPress={() => router.push("/profile/edit" as never)} style={{ flex: 1 }} />
        <Button title="Followers" variant="outline" onPress={() => router.push("/profile/followers" as never)} style={{ flex: 1 }} />
        <Button title="Following" variant="outline" onPress={() => router.push("/profile/following" as never)} style={{ flex: 1 }} />
      </View>
      <Button title="Open call request" onPress={() => router.push("/calls/request" as never)} />
    </Shell>
  );
}

export function EditProfileCatalogScreen() {
  const [bio, setBio] = useState("Late-night host, party room regular, and VIP chat closer.");
  const [displayName, setDisplayName] = useState("Aria Flame");

  return (
    <Shell title="Edit Profile" subtitle="Profile metadata, appearance, and public discovery settings.">
      <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How viewers see you" />
      <Input label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Tell viewers what you do" />
      <Input label="Languages" value="English, Hindi" onChangeText={() => undefined} placeholder="Comma separated" />
      <Input label="City" value="Delhi" onChangeText={() => undefined} placeholder="Location" />
      <Button title="Save profile changes" onPress={() => router.back()} />
    </Shell>
  );
}

function FollowGraphScreen({ title, subtitle, people }: { title: string; subtitle: string; people: Person[] }) {
  return (
    <Shell title={title} subtitle={subtitle}>
      {people.map((person) => (
        <PersonRow key={person.id} person={person} trailing={<Button title="View" size="sm" variant="outline" onPress={() => router.push(`/profile/${person.id}` as never)} />} />
      ))}
    </Shell>
  );
}

export function FollowersCatalogScreen() {
  return <FollowGraphScreen title="Followers" subtitle="Users who opted in to updates, live alerts, and ranking support." people={demoFollowers} />;
}

export function FollowingCatalogScreen() {
  return <FollowGraphScreen title="Following" subtitle="Creators, friends, and agencies this account tracks across the platform." people={[...demoFollowers].reverse()} />;
}

export function AgencyDashboardCatalogScreen() {
  return (
    <Shell title="Agency Dashboard" subtitle="Host roster, revenue performance, compliance queue, and commission visibility.">
      <HeroCard eyebrow="Agency" title="North Star Collective" body="The dashboard balances host growth, payout health, and moderation exposure without leaving mobile." />
      <StatsRow items={[{ label: "Active hosts", value: "84" }, { label: "This week GMV", value: "$12.4k" }, { label: "Pending reviews", value: "9" }]} />
      <QuickLinkGrid items={[{ label: "Members", icon: "👥", href: "/agency/members" }, { label: "Wallet", icon: "💸", href: "/wallet" }, { label: "Leaderboards", icon: "📈", href: "/leaderboards" }, { label: "Settings", icon: "⚙️", href: "/settings" }]} />
    </Shell>
  );
}

export function AgencyMembersCatalogScreen() {
  return (
    <Shell title="Agency Members" subtitle="Roster management for hosts, scouts, and under-review applicants.">
      {demoModels.map((person) => (
        <PersonRow key={person.id} person={person} trailing={<Badge text={person.online ? "Active" : "Offline"} color={person.online ? COLORS.success : COLORS.textSecondary} />} />
      ))}
    </Shell>
  );
}

export function AdminDashboardCatalogScreen() {
  return (
    <Shell title="Admin Dashboard" subtitle="Operations command center for trust, economy, flags, UI, and payouts.">
      <HeroCard eyebrow="Web only" title="Admin operations are intentionally excluded from the mobile product." body="The production app routes all moderation, finance, and platform controls to the secure web admin console instead of shipping an in-app admin surface." />
      <QuickLinkGrid
        items={[
          { label: "Home", icon: "🏠", href: "/(tabs)" },
          { label: "Wallet", icon: "💳", href: "/wallet" },
          { label: "Notifications", icon: "🔔", href: "/notifications" },
          { label: "Settings", icon: "⚙️", href: "/settings" },
        ]}
      />
    </Shell>
  );
}

export function UserManagementCatalogScreen() {
  return (
    <Shell title="User Management" subtitle="Search, suspend, restore, segment, and inspect risk on user accounts.">
      {demoFollowers.map((person, index) => (
        <PersonRow key={person.id} person={person} trailing={<Badge text={index % 2 === 0 ? "Healthy" : "Under review"} color={index % 2 === 0 ? COLORS.success : COLORS.warning} />} />
      ))}
    </Shell>
  );
}

export function GiftManagementCatalogScreen() {
  return (
    <Shell title="Gift Management" subtitle="Gift catalog control with price, animation tier, and availability toggles.">
      {demoGifts.map((gift) => (
        <Card key={gift.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <Text style={{ fontSize: 30 }}>{gift.emoji}</Text>
            <View>
              <Text style={{ fontWeight: "700", color: COLORS.text }}>{gift.name}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{gift.price} coins</Text>
            </View>
          </View>
          <Badge text={gift.price >= 499 ? "Premium" : "Standard"} color={gift.price >= 499 ? COLORS.primary : COLORS.success} />
        </Card>
      ))}
    </Shell>
  );
}

export function EconomyManagementCatalogScreen() {
  return (
    <Shell title="Economy Management" subtitle="Coin packages, commission rules, payout limits, and regional monetization profiles.">
      <StatsRow items={[{ label: "Active profiles", value: "14" }, { label: "Commission rules", value: "32" }, { label: "Pending changes", value: "5" }]} />
      <Card>
        <Text style={{ fontWeight: "700", color: COLORS.text }}>Current production profile</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>IN / creator_growth / v12</Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: "700", color: COLORS.text }}>Rule preview</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Agency hosts tier B receive 18% share on gift revenue and 12% on call revenue.</Text>
      </Card>
    </Shell>
  );
}

export function FeatureFlagsCatalogScreen() {
  return (
    <Shell title="Feature Flags" subtitle="Progressive rollout, user targeting, and rollback-safe mobile controls.">
      {adminFlags.map((flag) => (
        <Card key={flag.key}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: COLORS.text }}>{flag.key}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{flag.type} • {flag.value}</Text>
            </View>
            <Badge text={flag.state} color={flag.state === "Active" ? COLORS.success : COLORS.warning} />
          </View>
        </Card>
      ))}
    </Shell>
  );
}

export function UiLayoutEditorCatalogScreen() {
  return (
    <Shell title="UI Layout Editor" subtitle="Server-driven component placement, mobile breakpoints, and layout versioning.">
      {adminLayouts.map((layout) => (
        <Card key={layout.name}>
          <Text style={{ fontWeight: "700", color: COLORS.text }}>{layout.name}</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{layout.target} • {layout.version}</Text>
          <View style={{ marginTop: SPACING.sm, alignSelf: "flex-start" }}>
            <Badge text={layout.state} color={layout.state === "Published" ? COLORS.success : COLORS.primary} />
          </View>
        </Card>
      ))}
      <Button title="Open component positions" onPress={() => undefined} />
    </Shell>
  );
}

export function WithdrawApprovalsCatalogScreen() {
  return (
    <Shell title="Withdraw Approvals" subtitle="Risk-aware payout queue with diamond balance, fraud score, and approver actions.">
      {[
        { id: "w1", user: "Nova Jade", amount: "$480", score: "Low risk" },
        { id: "w2", user: "Maya Lux", amount: "$1,240", score: "Manual review" },
        { id: "w3", user: "Aria Flame", amount: "$320", score: "Low risk" },
      ].map((request) => (
        <Card key={request.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontWeight: "700", color: COLORS.text }}>{request.user}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{request.amount} • {request.score}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Button title="Approve" size="sm" onPress={() => undefined} />
              <Button title="Hold" size="sm" variant="outline" onPress={() => undefined} />
            </View>
          </View>
        </Card>
      ))}
    </Shell>
  );
}