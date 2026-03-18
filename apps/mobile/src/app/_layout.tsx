import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { I18nProvider, useI18n } from "@/i18n";
import { useAuthStore } from "@/store";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, Text, View } from "react-native";
import React, { Component, useCallback, useEffect, useRef, useState } from "react";
import { COLORS, FONT, SPACING } from "@/theme";

LogBox.ignoreLogs(["Clerk: Clerk has been loaded with development keys"]);

// Error boundary to prevent blank screen on uncaught errors
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

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MissingClerkConfigScreen() {
  const { t, isRTL } = useI18n();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: "center",
        padding: SPACING.xl,
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 20,
          padding: SPACING.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: SPACING.md,
        }}
      >
        <Text style={{ fontSize: FONT.sizes.title, fontWeight: "700", color: COLORS.text }}>
          {t("system.clerkMissingTitle")}
        </Text>
        <Text style={{ fontSize: FONT.sizes.md, color: COLORS.textSecondary, lineHeight: 22, textAlign: isRTL ? "right" : "left" }}>
          {t("system.clerkMissingBody")}
        </Text>
        <Text style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, textAlign: isRTL ? "right" : "left" }}>
          {t("system.clerkMissingHint")}
        </Text>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

function AuthBootstrap() {
  const { isLoaded, isSignedIn, userId: clerkUserId, getToken } = useAuth();
  const token = useAuthStore((s) => s.token);
  const authMode = useAuthStore((s) => s.authMode);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const me = trpc.user.getMe.useQuery(undefined, {
    enabled: isLoaded && isSignedIn,
    retry: 3,
    retryDelay: 1000,
  });

  // Set userId immediately so (tabs) gate doesn't block on the API call.
  // We upgrade to the backend ID once the getMe query resolves.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUserId) return;
    if (!useAuthStore.getState().userId) {
      setAuth(clerkUserId, "");
    }
  }, [clerkUserId, isLoaded, isSignedIn, setAuth]);

  // Fetch a real JWT and, once the backend responds, upgrade the user ID.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUserId) return;

    let cancelled = false;

    void (async () => {
      const nextToken = await getToken();
      if (!cancelled && nextToken) {
        const backendId = me.data?.id;
        setAuth(backendId ?? clerkUserId, nextToken);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clerkUserId, getToken, isLoaded, isSignedIn, me.data?.id, setAuth]);

  useEffect(() => {
    if (isLoaded && !isSignedIn && authMode === "authenticated" && token !== null) {
      clearAuth();
    }
  }, [authMode, clearAuth, isLoaded, isSignedIn, token]);

  return null;
}

function GuardedStack() {
  const { t } = useI18n();
  const { isSignedIn } = useAuth();
  const segments = useSegments();
  const me = trpc.user.getMe.useQuery(undefined, { enabled: isSignedIn, retry: false });

  useEffect(() => {
    const rootSegment = segments[0];
    if (!rootSegment) return;

    if (rootSegment === "admin") {
      router.replace("/(tabs)");
      return;
    }

    if (rootSegment === "agency" && !isSignedIn) {
      router.replace("/(auth)/login");
      return;
    }

    const role = String(me.data?.role ?? "");
    if (rootSegment === "agency" && isSignedIn && me.data && !["ADMIN", "HOST", "MODEL"].includes(role)) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, me.data, segments]);

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
  const { isLoaded, getToken } = useAuth();

  // Keep a ref to the latest getToken so the tRPC client never needs to be
  // recreated. React 19 Fabric profiling crashes when diffing Proxy-based
  // objects, so the client must be created exactly once.
  const getTokenRef = useRef<typeof getToken>(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const stableGetToken = useCallback(
    () => (getTokenRef.current ? getTokenRef.current() : Promise.resolve(null)),
    [],
  );

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
  }));
  const [trpcClient] = useState(() => createTrpcClient({ getToken: stableGetToken }));

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        <StatusBar style="dark" />
        <GuardedStack />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        {!publishableKey ? (
          <MissingClerkConfigScreen />
        ) : (
          <ClerkProvider
            publishableKey={publishableKey}
            tokenCache={tokenCache}
          >
            <RootLayoutNav />
          </ClerkProvider>
        )}
      </I18nProvider>
    </ErrorBoundary>
  );
}
