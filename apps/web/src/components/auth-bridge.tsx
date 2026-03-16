"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useMemo } from "react";

type AuthBridgeValue = {
  clerkAvailable: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
};

const defaultValue: AuthBridgeValue = {
  clerkAvailable: false,
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  getToken: async () => null,
};

const AuthBridgeContext = createContext<AuthBridgeValue>(defaultValue);

function ClerkStateBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const getTokenSafe = useCallback(() => getToken(), [getToken]);

  const value = useMemo<AuthBridgeValue>(() => ({
    clerkAvailable: true,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
    getToken: getTokenSafe,
  }), [getTokenSafe, isLoaded, isSignedIn, userId]);

  return <AuthBridgeContext.Provider value={value}>{children}</AuthBridgeContext.Provider>;
}

export function AuthBridgeProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return <AuthBridgeContext.Provider value={defaultValue}>{children}</AuthBridgeContext.Provider>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkStateBridge>{children}</ClerkStateBridge>
    </ClerkProvider>
  );
}

export function useAuthBridge() {
  return useContext(AuthBridgeContext);
}