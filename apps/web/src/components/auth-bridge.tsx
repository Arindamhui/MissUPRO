"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { logoutRequest } from "@/lib/auth-api";
import { clearWebAuthSession, loadWebAuthSession, persistWebAuthSession, type WebAuthSession } from "@/lib/web-auth";

type AuthBridgeValue = {
  authAvailable: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  getToken: () => Promise<string | null>;
  setSession: (session: WebAuthSession) => void;
  clearSession: () => void;
  signOut: () => Promise<void>;
};

const defaultValue: AuthBridgeValue = {
  authAvailable: true,
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  email: null,
  displayName: null,
  getToken: async () => null,
  setSession: () => undefined,
  clearSession: () => undefined,
  signOut: async () => undefined,
};

const AuthBridgeContext = createContext<AuthBridgeValue>(defaultValue);

export function AuthBridgeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<WebAuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedSession = loadWebAuthSession();
    if (storedSession) {
      setSessionState(storedSession);
    }
    setIsLoaded(true);
  }, []);

  const setSession = useCallback((nextSession: WebAuthSession) => {
    persistWebAuthSession(nextSession);
    setSessionState(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    clearWebAuthSession();
    setSessionState(null);
  }, []);

  const signOut = useCallback(async () => {
    if (session?.token) {
      try {
        await logoutRequest(session.token);
      } catch {
        // Best effort.
      }
    }

    clearSession();
  }, [clearSession, session?.token]);

  const value = useMemo<AuthBridgeValue>(() => ({
    authAvailable: true,
    isLoaded,
    isSignedIn: Boolean(session?.token),
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    displayName: session?.user.displayName ?? null,
    getToken: async () => session?.token ?? null,
    setSession,
    clearSession,
    signOut,
  }), [clearSession, isLoaded, session, setSession, signOut]);

  return <AuthBridgeContext.Provider value={value}>{children}</AuthBridgeContext.Provider>;
}

export function useAuthBridge() {
  return useContext(AuthBridgeContext);
}