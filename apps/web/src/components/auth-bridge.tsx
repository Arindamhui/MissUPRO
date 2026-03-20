"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";

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

/**
 * Reads Clerk auth state (provided by ClerkProvider in root layout)
 * and exposes it through the AuthBridge context.
 */
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

export function AuthBridgeProvider({ children, clerkEnabled }: { children: React.ReactNode; clerkEnabled: boolean }) {
  if (!clerkEnabled) {
    return <AuthBridgeContext.Provider value={defaultValue}>{children}</AuthBridgeContext.Provider>;
  }

  return <ClerkStateBridge>{children}</ClerkStateBridge>;
}

export function useAuthBridge() {
  return useContext(AuthBridgeContext);
}