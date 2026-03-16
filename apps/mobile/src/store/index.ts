import { create } from "zustand";

type AuthMode = "signed_out" | "guest" | "authenticated";

interface AuthState {
  userId: string | null;
  token: string | null;
  authMode: AuthMode;
  guestId: string | null;
  guestName: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string, token: string) => void;
  continueAsGuest: (guestId: string, guestName: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  authMode: "signed_out",
  guestId: null,
  guestName: null,
  isAuthenticated: false,
  setAuth: (userId, token) => set({
    userId,
    token,
    authMode: "authenticated",
    guestId: null,
    guestName: null,
    isAuthenticated: true,
  }),
  continueAsGuest: (guestId, guestName) => set({
    userId: guestId,
    token: null,
    authMode: "guest",
    guestId,
    guestName,
    isAuthenticated: false,
  }),
  clearAuth: () => set({
    userId: null,
    token: null,
    authMode: "signed_out",
    guestId: null,
    guestName: null,
    isAuthenticated: false,
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
