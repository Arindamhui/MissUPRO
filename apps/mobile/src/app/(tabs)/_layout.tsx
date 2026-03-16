import { useAuth } from "@clerk/clerk-expo";
import { Tabs, Redirect } from "expo-router";
import { COLORS } from "@/theme";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "@/store";
import { useCallSocket } from "@/hooks/useSocket";

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

  const hasAppAccess = isSignedIn || authMode === "guest";

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
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} />,
      }} />
      <Tabs.Screen name="discover" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="🔍" label="Discover" focused={focused} />,
      }} />
      <Tabs.Screen name="live" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="📺" label="Live" focused={focused} />,
      }} />
      <Tabs.Screen name="messages" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="💬" label="Messages" focused={focused} />,
      }} />
      <Tabs.Screen name="me" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Me" focused={focused} />,
      }} />
    </Tabs>
  );
}
