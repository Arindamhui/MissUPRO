import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { I18nProvider, useI18n } from "@/i18n";
import { clearStoredAuthSession, loadStoredAuthSession } from "@/lib/auth-storage";
import { useAuthStore } from "@/store";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import React, { Component, useEffect, useState } from "react";
import { COLORS } from "@/theme";

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#E17055" }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: "#777", textAlign: "center" }}>{this.state.error.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AuthBootstrap() {
  const authMode = useAuthStore((state) => state.authMode);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);
  const markHydrated = useAuthStore((state) => state.markHydrated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setMobilePanel = useAuthStore((state) => state.setMobilePanel);

  useEffect(() => {
    let cancelled = false;

    void loadStoredAuthSession().then((session) => {
      if (cancelled) {
        return;
      }

      if (session) {
        hydrateAuth({
          userId: session.user.id,
          token: session.token,
          sessionId: session.sessionId,
          email: session.user.email,
          displayName: session.user.displayName,
        });
        return;
      }

      markHydrated();
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, markHydrated]);

  const isAuthenticated = authMode === "authenticated";
  const me = trpc.user.getMe.useQuery(undefined, {
    enabled: isHydrated && isAuthenticated,
    retry: false,
  });
  const mobileSession = trpc.auth.getMobileSession.useQuery(undefined, {
    enabled: isHydrated && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!mobileSession.data) {
      return;
    }

    setMobilePanel(
      mobileSession.data.panel,
      mobileSession.data.agencyId ?? null,
      mobileSession.data.agencyName ?? null,
    );
  }, [mobileSession.data, setMobilePanel]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    if (me.error || mobileSession.error) {
      clearAuth();
      void clearStoredAuthSession();
    }
  }, [clearAuth, isAuthenticated, isHydrated, me.error, mobileSession.error]);

  return null;
}

function GuardedStack() {
  const { t } = useI18n();
  const authMode = useAuthStore((state) => state.authMode);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const segments = useSegments();
  const isAuthenticated = authMode === "authenticated";
  const me = trpc.user.getMe.useQuery(undefined, {
    enabled: isHydrated && isAuthenticated,
    retry: false,
  });
  const mobileSession = trpc.auth.getMobileSession.useQuery(undefined, {
    enabled: isHydrated && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const rootSegment = segments[0];
    if (!rootSegment) {
      return;
    }

    const isOnboardingRoute = rootSegment === "onboarding";

    if (isAuthenticated && mobileSession.data?.status === "needs_onboarding" && !isOnboardingRoute) {
      router.replace("/onboarding");
      return;
    }

    if (isAuthenticated && mobileSession.data && mobileSession.data.status !== "needs_onboarding" && isOnboardingRoute) {
      router.replace("/(tabs)");
      return;
    }

    if (rootSegment === "admin") {
      router.replace("/(tabs)");
      return;
    }

    if (rootSegment === "agency" && !isAuthenticated) {
      router.replace("/(auth)/login");
      return;
    }

    const role = String(me.data?.role ?? "");
    if (rootSegment === "agency" && isAuthenticated && me.data && !["ADMIN", "HOST", "MODEL"].includes(role)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, me.data, mobileSession.data, segments]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      <Stack.Screen name="call/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="stream/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="party/[id]" options={{ title: t("navigation.partyRoom") }} />
      <Stack.Screen name="group-audio/[id]" options={{ title: t("navigation.audioRoom") }} />
      <Stack.Screen name="profile/[id]" options={{ title: t("navigation.profile") }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ title: t("navigation.chat") }} />
      <Stack.Screen name="settings/linked-accounts" options={{ headerShown: false }} />
      <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="settings/effects" options={{ headerShown: false }} />
      <Stack.Screen name="settings/app-alerts" options={{ headerShown: false }} />
      <Stack.Screen name="settings/language" options={{ headerShown: false }} />
      <Stack.Screen name="settings/article/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="messages/friends" options={{ headerShown: false }} />
      <Stack.Screen name="messages/settings" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: false }} />
      <Stack.Screen name="wallet/purchase" options={{ headerShown: false }} />
      <Stack.Screen name="wallet/history" options={{ headerShown: false }} />
      <Stack.Screen name="store" options={{ headerShown: false }} />
      <Stack.Screen name="bag" options={{ headerShown: false }} />
      <Stack.Screen name="tasks" options={{ headerShown: false }} />
      <Stack.Screen name="badges" options={{ headerShown: false }} />
      <Stack.Screen name="people" options={{ headerShown: false }} />
      <Stack.Screen name="room-management" options={{ headerShown: false }} />
      <Stack.Screen name="room-blacklist" options={{ headerShown: false }} />
      <Stack.Screen name="feedback" options={{ headerShown: false }} />
      <Stack.Screen name="market" options={{ headerShown: false }} />
      <Stack.Screen name="moments" options={{ headerShown: false }} />
      <Stack.Screen name="status" options={{ headerShown: false }} />
      <Stack.Screen name="gifts" options={{ title: t("navigation.gifts") }} />
      <Stack.Screen name="notifications" options={{ title: t("navigation.notifications") }} />
      <Stack.Screen name="creator-dashboard" options={{ title: t("navigation.creatorDashboard") }} />
      <Stack.Screen name="events" options={{ title: t("navigation.events") }} />
      <Stack.Screen name="games" options={{ headerShown: false }} />
      <Stack.Screen name="vip" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="referrals" options={{ headerShown: false }} />
      <Stack.Screen name="leaderboards" options={{ headerShown: false }} />
      <Stack.Screen name="leaderboards/[boardKey]" options={{ headerShown: false }} />
      <Stack.Screen name="pk/battle" options={{ title: "PK Battle" }} />
      <Stack.Screen name="pk/results" options={{ title: "PK Results" }} />
      <Stack.Screen name="agency/dashboard" options={{ title: "Agency Dashboard" }} />
      <Stack.Screen name="agency/members" options={{ title: "Agency Members" }} />
    </Stack>
  );
}

function RootLayoutNav() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
      }),
  );
  const [trpcClient] = useState(
    () =>
      createTrpcClient({
        getToken: async () => useAuthStore.getState().token,
      }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        {!isHydrated ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <StatusBar style="dark" />
            <GuardedStack />
          </>
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <RootLayoutNav />
      </I18nProvider>
    </ErrorBoundary>
  );
}
