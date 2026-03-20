import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, Redirect } from "expo-router";
import { COLORS } from "@/theme";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/store";
import { useCallSocket } from "@/hooks/useSocket";
import { trpc } from "@/lib/trpc";
import { getMobileLayoutScope, getMobileRuntimeScope } from "@/lib/runtime-config";

const routeMeta: Record<string, { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  index: { label: "Live", icon: "video-wireless-outline" },
  discover: { label: "Shorts", icon: "play-box-multiple-outline" },
  host: { label: "Host", icon: "account-star-outline" },
  messages: { label: "Message", icon: "message-processing-outline" },
  me: { label: "Me", icon: "account-circle-outline" },
};

function TabIcon({ route, label, focused }: { route: string; label: string; focused: boolean }) {
  const meta = routeMeta[route] ?? routeMeta.index!;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
      <MaterialCommunityIcons color={focused ? "#FFFFFF" : "rgba(226,231,255,0.62)"} name={meta.icon} size={24} />
      <Text style={{
        fontSize: 11,
        fontWeight: focused ? "700" : "500",
        color: focused ? "#FFFFFF" : "rgba(226,231,255,0.62)",
        marginTop: 2,
      }}>{label}</Text>
    </View>
  );
}

function LiveTabButton({ onPress, accessibilityState }: { onPress?: (...args: any[]) => void; accessibilityState?: { selected?: boolean } }) {
  const focused = accessibilityState?.selected;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ top: -26, justifyContent: "center", alignItems: "center" }}>
      <LinearGradient
        colors={focused ? ["#F7FCFF", "#E2F0FF"] : ["#FFFFFF", "#F0F6FF"]}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: "rgba(25,31,89,0.88)",
          shadowColor: "#01051B",
          shadowOpacity: 0.34,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }}
      >
        <MaterialCommunityIcons color="#7D8DE6" name="snowflake-variant" size={34} />
      </LinearGradient>
    </TouchableOpacity>
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
    { route: "index", label: "Live", order: 0, visible: true },
    { route: "discover", label: "Shorts", order: 1, visible: true },
    { route: "host", label: "Host", order: 2, visible: true },
    { route: "messages", label: "Message", order: 3, visible: true },
    { route: "me", label: "Me", order: 4, visible: true },
  ];
  const apiTabs = Array.isArray(layoutQuery.data?.tabNavigation) ? layoutQuery.data?.tabNavigation : [];
  const enabledFlags = new Map(((bootstrapQuery.data?.featureFlags ?? []) as any[]).map((flag) => [String(flag.flagKey), Boolean(flag.enabled)]));
  const visibleTabs = (apiTabs.length > 0 ? apiTabs : defaultTabs)
    .filter((item: any) => {
      const route = String(item.route);
      if (!["index", "discover", "host", "live", "messages", "me"].includes(route) || item.visible === false) {
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
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          backgroundColor: "rgba(21,25,79,0.98)",
          borderTopWidth: 0,
          height: 78,
          paddingBottom: 10,
          paddingTop: 8,
          borderRadius: 28,
          shadowColor: "#03061A",
          shadowOpacity: 0.32,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
        tabBarShowLabel: false,
      }}
    >
      {visibleTabs.map((tab: any) => (
        <Tabs.Screen
          key={String(tab.route)}
          name={String(tab.route)}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon route={String(tab.route)} label={String(tab.label ?? routeMeta[String(tab.route)]?.label ?? tab.route)} focused={focused} />,
            tabBarButton: ["host", "live"].includes(String(tab.route)) ? (props) => <LiveTabButton {...props} /> : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
