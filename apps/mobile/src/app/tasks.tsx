import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { GlassPanel, GradientButton, HeaderTabs, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

type RewardItem = {
  id: string;
  title: string;
  subtitle: string;
  points: number;
};

function TaskRow({ title, subtitle, reward, completed, onPress }: { title: string; subtitle: string; reward: number; completed: boolean; onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(120,120,140,0.12)" }}>
      <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#1B8169", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
        <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "900" }}>T</Text>
      </View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ color: "#4B1820", fontSize: 15, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: "#FF56A6", fontSize: 14, marginTop: 3 }}>{reward} pts</Text>
        <Text style={{ color: "#725E63", fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onPress} style={{ minWidth: 88, borderRadius: 999, borderWidth: 1.5, borderColor: completed ? "#D4B6C3" : "#F0389B", paddingVertical: 10, paddingHorizontal: 18, alignItems: "center" }}>
        <Text style={{ color: completed ? "#9C8E94" : "#F0389B", fontSize: 14, fontWeight: "800" }}>{completed ? "Done" : "Play"}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExchangeRow({ item }: { item: RewardItem }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(120,120,140,0.12)" }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "#FFF0C5", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
        <Text style={{ fontSize: 22 }}>🎁</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#26212C", fontSize: 16, fontWeight: "700" }}>{item.title}</Text>
        <Text style={{ color: "#66616C", fontSize: 13, marginTop: 4 }}>{item.points} Points</Text>
      </View>
      <TouchableOpacity style={{ borderRadius: 999, overflow: "hidden" }}>
        <View style={{ backgroundColor: "#F2F2F6" }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 11, backgroundColor: "transparent" }}>
            <Text style={{ color: "#FFFFFF" }} />
          </View>
        </View>
      </TouchableOpacity>
      <View style={{ position: "absolute", right: 0 }}>
        <GradientButton title="Exchange" onPress={() => undefined} small disabled />
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const [tab, setTab] = useState("tasks");
  const squadOverview = trpc.agency.getMySquadOverview.useQuery(undefined, { retry: false });
  const wallet = trpc.wallet.getBalance.useQuery(undefined, { retry: false });
  const vipTiers = trpc.vip.getAvailableTiers.useQuery(undefined, { retry: false });
  const themes = trpc.party.listAvailableThemes.useQuery(undefined, { retry: false });

  const taskMap = squadOverview.data?.tasks as Record<string, { completed?: boolean; rewardPoints?: number }> | undefined;
  const taskRows = useMemo(() => ([
    { id: "checkIn", title: "Daily Check-In", subtitle: "Check in once today and claim your progress bonus", completed: Boolean(taskMap?.checkIn?.completed), reward: Number(taskMap?.checkIn?.rewardPoints ?? 20), route: "/(tabs)/discover" },
    { id: "squadTalk", title: "Squad Talk", subtitle: "Send a squad message to keep your room active", completed: Boolean(taskMap?.squadTalk?.completed), reward: Number(taskMap?.squadTalk?.rewardPoints ?? 20), route: "/messages/friends" },
    { id: "squadFriendFinder", title: "Friend Finder", subtitle: "Follow and connect with squad mates to complete the task", completed: Boolean(taskMap?.squadFriendFinder?.completed), reward: Number(taskMap?.squadFriendFinder?.rewardPoints ?? 100), route: "/people" },
    { id: "watchingBroads", title: "Watch Live", subtitle: "Spend time in live rooms and move your progress bar forward", completed: Boolean(taskMap?.watchingBroads?.completed), reward: Number(taskMap?.watchingBroads?.rewardPoints ?? 50), route: "/(tabs)/live" },
    { id: "gifting", title: "Send Gift", subtitle: "Send at least one gift today to finish this task", completed: Boolean(taskMap?.gifting?.completed), reward: Number(taskMap?.gifting?.rewardPoints ?? 30), route: "/gifts" },
  ]), [taskMap]);

  const rewards = useMemo<RewardItem[]>(() => {
    const tierRewards = ((vipTiers.data ?? []) as any[]).slice(0, 3).map((tier, index) => ({
      id: `vip-${index}`,
      title: `${String(tier.name ?? "VIP")} (${String(tier.durationDays ?? tier.duration ?? "3 days")})`,
      subtitle: "VIP upgrade",
      points: Math.max(500, Number(tier.priceCoins ?? tier.price ?? 5000)),
    }));
    const themeRewards = ((themes.data ?? []) as any[]).slice(0, 6).map((theme, index) => ({
      id: `theme-${index}`,
      title: String(theme.themeName ?? "Theme unlock"),
      subtitle: "Garage reward",
      points: Math.max(100, Number(theme.coinPrice ?? 100)),
    }));
    return [...tierRewards, ...themeRewards];
  }, [themes.data, vipTiers.data]);

  const currentPoints = Number(wallet.data?.coinBalance ?? 0);

  return (
    <WinterScreen title="My Tasks">
      <HeaderTabs items={[{ key: "tasks", label: "Task" }, { key: "rewards", label: "Inaam Ghar" }]} activeKey={tab} onChange={setTab} />

      {tab === "tasks" ? (
        <>
          <GlassPanel style={{ backgroundColor: "#FFF9F6", borderColor: "#FFD0D5" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: "#55222B", fontSize: 18, fontWeight: "800" }}>Top-Up Reward</Text>
                <Text style={{ color: "#F1389B", fontSize: 16, fontWeight: "800", marginTop: 8 }}>Value {currentPoints.toLocaleString()}</Text>
                <Text style={{ color: "#8B6A70", fontSize: 13, marginTop: 6 }}>Use real wallet and squad progress to complete the reward track.</Text>
              </View>
              <GradientButton title="Top-Up" onPress={() => router.push("/wallet/purchase" as never)} small />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              {taskRows.slice(0, 4).map((task) => (
                <View key={task.id} style={{ flex: 1, backgroundColor: "#FFF3EF", borderRadius: 18, paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: task.completed ? "#F05BB0" : "transparent" }}>
                  <Text style={{ fontSize: 22 }}>🎁</Text>
                  <Text style={{ color: "#63323C", fontSize: 12, marginTop: 8 }}>Value {Math.max(4, Math.round(task.reward / 10))}.0K</Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 16, backgroundColor: "#FFDDE9", borderRadius: 999, padding: 5 }}>
              <View style={{ width: `${Math.min(100, (taskRows.filter((task) => task.completed).length / Math.max(1, taskRows.length)) * 100)}%`, backgroundColor: "#F487C0", borderRadius: 999, paddingVertical: 6 }} />
            </View>
            <Text style={{ color: "#8A6B71", fontSize: 13, textAlign: "center", marginTop: 10 }}>Top up to complete the goal to get rewards</Text>
          </GlassPanel>

          <GlassPanel style={{ backgroundColor: "#FFFDF9", borderColor: "rgba(255,214,129,0.5)" }}>
            <Text style={{ color: "#55222B", fontSize: 18, fontWeight: "800", marginBottom: 6 }}>Daily Task</Text>
            {taskRows.map((task) => (
              <TaskRow key={task.id} title={task.title} subtitle={task.subtitle} reward={task.reward} completed={task.completed} onPress={() => router.push(task.route as never)} />
            ))}
          </GlassPanel>
        </>
      ) : (
        <GlassPanel style={{ backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.15)" }}>
          {rewards.map((item) => <ExchangeRow key={item.id} item={item} />)}
        </GlassPanel>
      )}
    </WinterScreen>
  );
}