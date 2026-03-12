import { create } from "zustand";

interface AuthState {
  userId: string | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  token: null,
  isAuthenticated: false,
  setAuth: (userId, token) => set({ userId, token, isAuthenticated: true }),
  clearAuth: () => set({ userId: null, token: null, isAuthenticated: false }),
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
  isCalling: boolean;
  isInCall: boolean;
  otherUserId: string | null;
  agoraChannel: string | null;
  agoraToken: string | null;
  startCall: (callId: string, type: "audio" | "video", otherUserId: string) => void;
  acceptCall: (callId: string, channel: string, token: string) => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCallId: null,
  callType: null,
  isCalling: false,
  isInCall: false,
  otherUserId: null,
  agoraChannel: null,
  agoraToken: null,
  startCall: (callId, type, otherUserId) => set({
    activeCallId: callId, callType: type, isCalling: true, isInCall: false, otherUserId,
  }),
  acceptCall: (callId, channel, token) => set({
    activeCallId: callId, isCalling: false, isInCall: true, agoraChannel: channel, agoraToken: token,
  }),
  endCall: () => set({
    activeCallId: null, callType: null, isCalling: false, isInCall: false,
    otherUserId: null, agoraChannel: null, agoraToken: null,
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
