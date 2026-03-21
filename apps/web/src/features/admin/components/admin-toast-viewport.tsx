"use client";

import { CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminToastStore } from "@/stores/admin-toast-store";

const toneStyles = {
  success: {
    icon: CheckCircle2,
    ring: "ring-emerald-200",
    iconClass: "text-emerald-600",
  },
  error: {
    icon: OctagonAlert,
    ring: "ring-rose-200",
    iconClass: "text-rose-600",
  },
  info: {
    icon: Info,
    ring: "ring-sky-200",
    iconClass: "text-sky-600",
  },
};

export function AdminToastViewport() {
  const { toasts, dismissToast } = useAdminToastStore();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = toneStyles[toast.tone].icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] backdrop-blur ring-1",
              toneStyles[toast.tone].ring,
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 h-5 w-5", toneStyles[toast.tone].iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm text-slate-600">{toast.description}</p> : null}
              </div>
              <button className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => dismissToast(toast.id)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
