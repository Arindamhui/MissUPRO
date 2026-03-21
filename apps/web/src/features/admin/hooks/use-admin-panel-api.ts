"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthBridge } from "@/components/auth-bridge";
import { trpc } from "@/lib/trpc";
import { adminFetch, adminQuery, uploadGiftAsset } from "@/features/admin/lib/admin-rest-client";
import { useAdminToastStore } from "@/stores/admin-toast-store";

export function useAdminNotifier() {
  const pushToast = useAdminToastStore((state) => state.pushToast);
  return {
    success: (title: string, description?: string) => pushToast({ title, description, tone: "success" }),
    error: (title: string, description?: string) => pushToast({ title, description, tone: "error" }),
    info: (title: string, description?: string) => pushToast({ title, description, tone: "info" }),
  };
}

export function useGiftUpload() {
  const auth = useAuthBridge();
  const notify = useAdminNotifier();

  return useMutation({
    mutationFn: async (file: File) => uploadGiftAsset(file, await auth.getToken()),
    onSuccess: () => notify.success("Gift asset uploaded"),
    onError: (error: Error) => notify.error("Upload failed", error.message),
  });
}

export function useAdminHostsQuery(cursor?: string, limit = 20) {
  return useQuery({
    queryKey: ["admin-hosts", cursor, limit],
    queryFn: adminQuery<{ items: Record<string, unknown>[]; nextCursor: string | null }>(`/api/admin/hosts?${new URLSearchParams({ ...(cursor ? { cursor } : {}), limit: String(limit) }).toString()}`),
  });
}

export function useUpdateAdminHost() {
  const queryClient = useQueryClient();
  const notify = useAdminNotifier();

  return useMutation({
    mutationFn: async ({ hostId, payload }: { hostId: string; payload: Record<string, unknown> }) => {
      return adminFetch(`/api/admin/host/${hostId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-hosts"] });
      notify.success("Host updated");
    },
    onError: (error: Error) => notify.error("Host update failed", error.message),
  });
}

export function useApproveHostMutation() {
  const queryClient = useQueryClient();
  const notify = useAdminNotifier();

  return useMutation({
    mutationFn: async (payload: { requestId: string; approve: boolean; reviewNotes?: string }) => adminFetch("/api/admin/approve-host", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-hosts"] });
      notify.success("Host review applied");
    },
    onError: (error: Error) => notify.error("Host review failed", error.message),
  });
}

export function useAdminAgenciesRestQuery() {
  return useQuery({
    queryKey: ["admin-agencies-rest"],
    queryFn: adminQuery<{ items: Record<string, unknown>[]; nextCursor: string | null }>("/api/admin/agencies?limit=50"),
  });
}

export function useUpdateAgencyMutation() {
  const queryClient = useQueryClient();
  const notify = useAdminNotifier();

  return useMutation({
    mutationFn: async ({ agencyId, payload }: { agencyId: string; payload: Record<string, unknown> }) => adminFetch(`/api/admin/agency/${agencyId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-agencies-rest"] });
      notify.success("Agency updated");
    },
    onError: (error: Error) => notify.error("Agency update failed", error.message),
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const notify = useAdminNotifier();

  return useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: Record<string, unknown> }) => adminFetch(`/api/admin/user/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notify.success("User updated");
    },
    onError: (error: Error) => notify.error("User update failed", error.message),
  });
}

export function useAdminDashboardData() {
  const stats = trpc.admin.getDashboardStats.useQuery(undefined, { retry: false });
  const finances = trpc.admin.getFinancialOverview.useQuery(undefined, { retry: false });
  const revenue = trpc.analytics.getRevenueAnalytics.useQuery(
    { startDate: new Date(Date.now() - 14 * 86400000), endDate: new Date() },
    { retry: false },
  );
  return { stats, finances, revenue };
}
