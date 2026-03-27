let GoogleSignin: any = null;
try {
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch {
  // Native module not available (e.g., Expo Go)
}
import type { MobileAuthSession } from "@/lib/auth-api";
import { logoutRequest } from "@/lib/auth-api";
import { clearStoredAuthSession } from "@/lib/auth-storage";
import { saveStoredAuthSession } from "@/lib/auth-storage";
import { useAuthStore } from "@/store";

export async function persistMobileAuthSession(session: MobileAuthSession) {
  await saveStoredAuthSession(session);
  useAuthStore.getState().setAuth({
    userId: session.user.id,
    token: session.token,
    sessionId: session.sessionId,
    email: session.user.email,
    displayName: session.user.displayName,
  });
}

export async function signOutMobileSession() {
  const { token, clearAuth } = useAuthStore.getState();

  if (token) {
    try {
      await logoutRequest(token);
    } catch {
      // Best-effort logout. Local session still needs to be cleared.
    }
  }

  await clearStoredAuthSession();
  clearAuth();

  try { if (GoogleSignin) await GoogleSignin.signOut(); } catch { /* ignore if not signed in via Google */ }
}
