import { create } from "zustand";

type AuthMode = "signed_out" | "guest" | "authenticated";
type MobilePanel = "user" | "model" | "agency_model";

interface AuthState {
  userId: string | null;
  token: string | null;
  sessionId: string | null;
  email: string | null;
  displayName: string | null;
  authMode: AuthMode;
  mobilePanel: MobilePanel;
  agencyId: string | null;
  agencyName: string | null;
  guestId: string | null;
  guestName: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (session: { userId: string; token: string; sessionId: string; email?: string | null; displayName?: string | null }) => void;
  hydrateAuth: (session: { userId: string; token: string; sessionId: string; email?: string | null; displayName?: string | null } | null) => void;
  markHydrated: () => void;
  setMobilePanel: (panel: MobilePanel, agencyId?: string | null, agencyName?: string | null) => void;
  continueAsGuest: (guestId: string, guestName: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  sessionId: null,
  email: null,
  displayName: null,
  authMode: "signed_out",
  mobilePanel: "user",
  agencyId: null,
  agencyName: null,
  guestId: null,
  guestName: null,
  isAuthenticated: false,
  isHydrated: false,
  setAuth: ({ userId, token, sessionId, email, displayName }) => set({
    userId,
    token,
    sessionId,
    email: email ?? null,
    displayName: displayName ?? null,
    authMode: "authenticated",
    guestId: null,
    guestName: null,
    isAuthenticated: true,
    isHydrated: true,
  }),
  hydrateAuth: (session) => set({
    userId: session?.userId ?? null,
    token: session?.token ?? null,
    sessionId: session?.sessionId ?? null,
    email: session?.email ?? null,
    displayName: session?.displayName ?? null,
    authMode: session ? "authenticated" : "signed_out",
    isAuthenticated: Boolean(session?.token),
    guestId: null,
    guestName: null,
    isHydrated: true,
  }),
  markHydrated: () => set({ isHydrated: true }),
  setMobilePanel: (mobilePanel, agencyId, agencyName) => set({
    mobilePanel,
    agencyId: agencyId ?? null,
    agencyName: agencyName ?? null,
  }),
  continueAsGuest: (guestId, guestName) => set({
    userId: guestId,
    token: null,
    sessionId: null,
    email: null,
    displayName: guestName,
    authMode: "guest",
    guestId,
    guestName,
    isAuthenticated: false,
    isHydrated: true,
  }),
  clearAuth: () => set({
    userId: null,
    token: null,
    sessionId: null,
    email: null,
    displayName: null,
    authMode: "signed_out",
    mobilePanel: "user",
    agencyId: null,
    agencyName: null,
    guestId: null,
    guestName: null,
    isAuthenticated: false,
    isHydrated: true,
  }),
}));

interface WalletState {
  coinBalance: number;
  diamondBalance: number;
  setCoinBalance: (balance: number) => void;
  setDiamondBalance: (balance: number) => void;
  setBalances: (coins: number, diamonds: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  coinBalance: 0,
  diamondBalance: 0,
  setCoinBalance: (coinBalance) => set({ coinBalance }),
  setDiamondBalance: (diamondBalance) => set({ diamondBalance }),
  setBalances: (coinBalance, diamondBalance) => set({ coinBalance, diamondBalance }),
}));

interface CallState {
  activeCallId: string | null;
  callType: "audio" | "video" | null;
  callStatus: string | null;
  callDirection: "incoming" | "outgoing" | null;
  isCalling: boolean;
  isInCall: boolean;
  otherUserId: string | null;
  agoraChannel: string | null;
  agoraToken: string | null;
  agoraAppId: string | null;
  tokenExpiresAt: string | null;
  lowBalance: boolean;
  startCall: (callId: string, type: "audio" | "video", otherUserId: string, direction?: "incoming" | "outgoing") => void;
  acceptCall: (callId: string, channel: string, token: string, agoraAppId?: string | null, expiresAt?: string | null) => void;
  setRtcSession: (channel: string, token: string, agoraAppId?: string | null, expiresAt?: string | null) => void;
  syncCall: (payload: {
    callId: string;
    callType: "audio" | "video";
    otherUserId: string;
    status: string;
    direction?: "incoming" | "outgoing";
    channel?: string | null;
    token?: string | null;
    agoraAppId?: string | null;
    expiresAt?: string | null;
  }) => void;
  setLowBalance: (lowBalance: boolean) => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCallId: null,
  callType: null,
  callStatus: null,
  callDirection: null,
  isCalling: false,
  isInCall: false,
  otherUserId: null,
  agoraChannel: null,
  agoraToken: null,
  agoraAppId: null,
  tokenExpiresAt: null,
  lowBalance: false,
  startCall: (callId, type, otherUserId, direction = "outgoing") => set({
    activeCallId: callId, callType: type, callStatus: "REQUESTED", callDirection: direction, isCalling: true, isInCall: false, otherUserId, lowBalance: false,
  }),
  acceptCall: (callId, channel, token, agoraAppId, expiresAt) => set((state) => ({
    activeCallId: callId,
    callStatus: "ACTIVE",
    callDirection: state.callDirection ?? "outgoing",
    isCalling: false,
    isInCall: true,
    agoraChannel: channel,
    agoraToken: token,
    agoraAppId: agoraAppId ?? null,
    tokenExpiresAt: expiresAt ?? null,
    lowBalance: false,
  })),
  setRtcSession: (channel, token, agoraAppId, expiresAt) => set({
    agoraChannel: channel,
    agoraToken: token,
    agoraAppId: agoraAppId ?? null,
    tokenExpiresAt: expiresAt ?? null,
  }),
  syncCall: ({ callId, callType, otherUserId, status, direction, channel, token, agoraAppId, expiresAt }) => set((state) => ({
    activeCallId: callId,
    callType,
    otherUserId,
    callStatus: status,
    callDirection: direction ?? state.callDirection,
    isCalling: status === "REQUESTED",
    isInCall: status === "ACTIVE",
    agoraChannel: channel ?? null,
    agoraToken: token ?? null,
    agoraAppId: agoraAppId ?? null,
    tokenExpiresAt: expiresAt ?? null,
  })),
  setLowBalance: (lowBalance) => set({ lowBalance }),
  endCall: () => set({
    activeCallId: null, callType: null, callStatus: null, callDirection: null, isCalling: false, isInCall: false,
    otherUserId: null, agoraChannel: null, agoraToken: null, agoraAppId: null, tokenExpiresAt: null, lowBalance: false,
  }),
}));

interface UIState {
  isGiftDrawerOpen: boolean;
  selectedGiftTarget: { userId: string; context: string; roomId?: string } | null;
  openGiftDrawer: (target: { userId: string; context: string; roomId?: string }) => void;
  closeGiftDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isGiftDrawerOpen: false,
  selectedGiftTarget: null,
  openGiftDrawer: (target) => set({ isGiftDrawerOpen: true, selectedGiftTarget: target }),
  closeGiftDrawer: () => set({ isGiftDrawerOpen: false, selectedGiftTarget: null }),
}));
