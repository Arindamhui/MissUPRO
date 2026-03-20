"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthBridgeProvider, useAuthBridge } from "@/components/auth-bridge";
import { WebI18nProvider } from "@/i18n";
import { trpc, createTrpcClient } from "@/lib/trpc";

function TrpcProviders({ children }: { children: React.ReactNode }) {
  const auth = useAuthBridge();
  const getTokenRef = useRef(auth.getToken);

  useEffect(() => {
    getTokenRef.current = auth.getToken;
  }, [auth.getToken]);

  const stableGetToken = useCallback(() => getTokenRef.current(), []);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const [trpcClient] = useState(() => createTrpcClient({ getToken: stableGetToken }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export function Providers({ children, clerkEnabled }: { children: React.ReactNode; clerkEnabled: boolean }) {
  return (
    <WebI18nProvider>
      <AuthBridgeProvider clerkEnabled={clerkEnabled}>
        <TrpcProviders>{children}</TrpcProviders>
      </AuthBridgeProvider>
    </WebI18nProvider>
  );
}
