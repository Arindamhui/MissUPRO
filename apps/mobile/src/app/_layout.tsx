import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useMemo } from "react";
import { COLORS } from "@/theme";

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
  }));
  const trpcClient = useMemo(() => createTrpcClient(token ?? undefined), [token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="call/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="stream/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen name="party/[id]" options={{ title: "Party Room" }} />
          <Stack.Screen name="group-audio/[id]" options={{ title: "Audio Room" }} />
          <Stack.Screen name="profile/[id]" options={{ title: "Profile" }} />
          <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
          <Stack.Screen name="wallet" options={{ title: "Wallet" }} />
          <Stack.Screen name="vip" options={{ title: "VIP" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
