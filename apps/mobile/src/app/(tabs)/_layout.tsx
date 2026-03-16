import { useAuth } from "@clerk/clerk-expo";
import { Tabs, Redirect } from "expo-router";
import { COLORS } from "@/theme";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "@/store";
import { useCallSocket } from "@/hooks/useSocket";
import { trpc } from "@/lib/trpc";
import { getMobileLayoutScope, getMobileRuntimeScope } from "@/lib/runtime-config";

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 6 }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{
        fontSize: 10, fontWeight: focused ? "600" : "400",
        color: focused ? COLORS.primary : COLORS.textSecondary, marginTop: 2,
      }}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const userId = useAuthStore((s) => s.userId);
  const authMode = useAuthStore((s) => s.authMode);
  useCallSocket();
  const layoutScope = getMobileLayoutScope();
  const runtimeScope = getMobileRuntimeScope();
  const layoutQuery = trpc.config.getUILayout.useQuery({ layoutKey: "tab_navigation", ...layoutScope }, { retry: false });
  const bootstrapQuery = trpc.config.getBootstrap.useQuery(runtimeScope, { retry: false });

  const hasAppAccess = isSignedIn || authMode === "guest";
  const defaultTabs = [
    { route: "index", label: "Home", icon: "🏠", order: 0, visible: true },
    { route: "discover", label: "Discover", icon: "🔍", order: 1, visible: true },
    { route: "live", label: "Live", icon: "📺", order: 2, visible: true },
    { route: "messages", label: "Messages", icon: "💬", order: 3, visible: true },
    { route: "me", label: "Me", icon: "👤", order: 4, visible: true },
  ];
  const apiTabs = Array.isArray(layoutQuery.data?.tabNavigation) ? layoutQuery.data?.tabNavigation : [];
  const enabledFlags = new Map(((bootstrapQuery.data?.featureFlags ?? []) as any[]).map((flag) => [String(flag.flagKey), Boolean(flag.enabled)]));
  const visibleTabs = (apiTabs.length > 0 ? apiTabs : defaultTabs)
    .filter((item: any) => {
      const route = String(item.route);
      if (!["index", "discover", "live", "messages", "me"].includes(route) || item.visible === false) {
        return false;
      }
      if (route === "live") return enabledFlags.get("live_streaming") !== false;
      if (route === "messages") return enabledFlags.get("chat") !== false;
      return true;
    })
    .sort((left: any, right: any) => Number(left.order ?? 0) - Number(right.order ?? 0));

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!hasAppAccess) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 65,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      {visibleTabs.map((tab: any) => (
        <Tabs.Screen
          key={String(tab.route)}
          name={String(tab.route)}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon={String(tab.icon ?? "•")} label={String(tab.label ?? tab.route)} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
