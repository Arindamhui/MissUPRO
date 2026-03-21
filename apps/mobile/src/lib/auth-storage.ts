import * as SecureStore from "expo-secure-store";
import type { MobileAuthSession } from "@/lib/auth-api";

const AUTH_STORAGE_KEY = "missu.mobile.auth.session";

export async function saveStoredAuthSession(session: MobileAuthSession) {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function loadStoredAuthSession(): Promise<MobileAuthSession | null> {
  const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as MobileAuthSession;
    if (!parsed?.token || !parsed?.sessionId || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearStoredAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}