import { create } from "zustand";

export type AdminToastTone = "success" | "error" | "info";

export type AdminToast = {
  id: string;
  title: string;
  description?: string;
  tone: AdminToastTone;
};

type AdminToastState = {
  toasts: AdminToast[];
  pushToast: (toast: Omit<AdminToast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useAdminToastStore = create<AdminToastState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }));
    }, 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
}));
