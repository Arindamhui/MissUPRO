"use client";

import { useDeferredValue, useState } from "react";
import { Crown, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/lib/utils";
import { AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard, AdminModal, AdminPageHeader, AdminPanelCard, AdminPagination, AdminSearchField, AdminSelect, AdminStatusPill, AdminTabs } from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type UserRow = {
  id: string;
  email: string;
  role: string;
  platformRole?: string | null;
  status: string;
  authProvider?: string | null;
  displayName: string;
  createdAt: string | Date;
};

type UserDetail = {
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    displayName: string;
    username: string;
    role: string;
    platformRole?: string | null;
    authRole?: string | null;
    authProvider?: string | null;
    status: string;
    country: string;
    city?: string | null;
    preferredLocale?: string | null;
    preferredTimezone?: string | null;
    isVerified?: boolean;
    createdAt: string | Date;
    lastActiveAt?: string | Date | null;
  } | null;
  profile?: {
    bio?: string | null;
    locationDisplay?: string | null;
    profileCompletenessScore?: number | null;
  } | null;
  wallet?: {
    coinBalance?: number;
    diamondBalance?: number;
    lifetimeCoinsPurchased?: number;
    lifetimeCoinsSpent?: number;
    lifetimeDiamondsEarned?: number;
    lifetimeDiamondsWithdrawn?: number;
  } | null;
};

const STATUS_OPTIONS = ["ALL", "ACTIVE", "SUSPENDED", "BANNED", "PENDING_VERIFICATION", "DELETED"];
const AUTH_PROVIDER_OPTIONS = ["ALL", "EMAIL", "GOOGLE", "FACEBOOK", "PHONE_OTP", "WHATSAPP_OTP", "CUSTOM_OTP", "UNKNOWN"];
const ROLE_OPTIONS = ["USER", "HOST", "MODEL", "ADMIN"];

export default function AdminUsersPage() {
  const notify = useAdminNotifier();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [authProviderFilter, setAuthProviderFilter] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [detailTab, setDetailTab] = useState("profile");
  const [walletAdjust, setWalletAdjust] = useState({ coinDelta: "0", diamondDelta: "0", description: "" });
  const [vipGrant, setVipGrant] = useState({ tierCode: "VIP", durationDays: "30" });
  const deferredSearch = useDeferredValue(search);

  const listUsers = trpc.admin.listUsers.useQuery(
    {
      cursor: cursorStack[pageIndex],
      limit: 20,
      search: deferredSearch.trim() || undefined,
      authProvider: authProviderFilter === "ALL" ? undefined : authProviderFilter as typeof AUTH_PROVIDER_OPTIONS[number],
    },
    { retry: false },
  );
  const userDetail = trpc.admin.getUserDetail.useQuery(
    { userId: selectedUserId ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: Boolean(selectedUserId) },
  );
  const updateUserStatus = trpc.admin.updateUserStatus.useMutation({
    onSuccess: async () => {
      notify.success("User status updated");
      await Promise.all([listUsers.refetch(), userDetail.refetch()]);
    },
    onError: (error: Error) => notify.error("Status update failed", error.message),
  });
  const updateUserRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      notify.success("User role updated");
      await Promise.all([listUsers.refetch(), userDetail.refetch()]);
    },
    onError: (error: Error) => notify.error("Role update failed", error.message),
  });
  const adjustWallet = trpc.admin.adjustUserWallet.useMutation({
    onSuccess: async () => {
      notify.success("Wallet adjusted");
      setWalletAdjust({ coinDelta: "0", diamondDelta: "0", description: "" });
      await userDetail.refetch();
    },
    onError: (error: Error) => notify.error("Wallet adjustment failed", error.message),
  });
  const grantVip = trpc.admin.grantUserVip.useMutation({
    onSuccess: async () => {
      notify.success("VIP granted");
      await userDetail.refetch();
    },
    onError: (error: Error) => notify.error("VIP grant failed", error.message),
  });

  const rawRows = (listUsers.data?.items ?? []) as UserRow[];
  const rows = rawRows.filter((row) => statusFilter === "ALL" || row.status === statusFilter);
  const detail = (userDetail.data ?? null) as UserDetail | null;
  const selectedUser = detail?.user;

  function handleNextPage() {
    if (!listUsers.data?.nextCursor) return;
    setCursorStack((current) => {
      const next = [...current];
      next[pageIndex + 1] = listUsers.data?.nextCursor;
      return next;
    });
    setPageIndex((current) => current + 1);
  }

  function handlePreviousPage() {
    if (pageIndex === 0) return;
    setPageIndex((current) => current - 1);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Identity Control"
        title="Users"
        description="Search, moderate, re-role, top up, and grant VIP access from one admin workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Visible Users" value={formatNumber(rows.length)} icon={UserRound} />
        <AdminMetricCard label="Active Accounts" value={formatNumber(rows.filter((row) => row.status === "ACTIVE").length)} icon={ShieldCheck} tone="emerald" />
        <AdminMetricCard label="VIP Candidates" value={formatNumber(rows.filter((row) => row.role === "USER").length)} icon={Crown} tone="amber" />
        <AdminMetricCard label="Wallet Review Queue" value={formatNumber(rows.filter((row) => row.status !== "BANNED").length)} icon={WalletCards} tone="sky" />
      </div>

      <AdminPanelCard
        title="User Directory"
        subtitle="Filter the identity graph, then open an account for full admin controls."
        actions={
          <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,320px)_220px_220px]">
            <AdminSearchField value={search} onChange={setSearch} placeholder="Search by display name or email" />
            <AdminSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status === "ALL" ? "All statuses" : status.replaceAll("_", " ")}</option>)}
            </AdminSelect>
            <AdminSelect value={authProviderFilter} onChange={(event) => setAuthProviderFilter(event.target.value)}>
              {AUTH_PROVIDER_OPTIONS.map((provider) => <option key={provider} value={provider}>{provider === "ALL" ? "All auth providers" : provider.replaceAll("_", " ")}</option>)}
            </AdminSelect>
          </div>
        }
      >
        <AdminDataTable
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={listUsers.isLoading}
          emptyMessage="No users match the current filters."
          columns={[
            { key: "displayName", label: "User", sortable: true, render: (row) => <div><p className="font-medium text-slate-900">{row.displayName}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
            { key: "role", label: "Role", sortable: true, render: (row) => row.role },
            { key: "authProvider", label: "Auth", render: (row) => String(row.authProvider ?? "UNKNOWN").replaceAll("_", " ") },
            { key: "status", label: "Status", sortable: true, render: (row) => <AdminStatusPill value={row.status} /> },
            { key: "createdAt", label: "Joined", sortable: true, render: (row) => formatDate(row.createdAt) },
            { key: "actions", label: "", render: (row) => <AdminButton variant="ghost" onClick={() => { setSelectedUserId(row.id); setDetailTab("profile"); }}>Open</AdminButton> },
          ]}
        />
        <div className="mt-5">
          <AdminPagination pageLabel={`Page ${pageIndex + 1}`} onPrevious={handlePreviousPage} onNext={handleNextPage} disablePrevious={pageIndex === 0} disableNext={!listUsers.data?.nextCursor} />
        </div>
      </AdminPanelCard>

      <AdminModal open={Boolean(selectedUserId)} onClose={() => setSelectedUserId(null)} title={selectedUser ? selectedUser.displayName : "User Details"} description="Inspect account profile, wallet state, and admin controls.">
        {selectedUser ? (
          <div className="space-y-6">
            <AdminTabs value={detailTab} onChange={setDetailTab} tabs={[{ value: "profile", label: "Profile" }, { value: "wallet", label: "Wallet" }, { value: "access", label: "Access" }]} />

            {detailTab === "profile" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AdminPanelCard title="Account" className="border-slate-100 shadow-none">
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-900">Email:</span> {selectedUser.email}</p>
                    <p><span className="font-medium text-slate-900">Username:</span> {selectedUser.username}</p>
                    <p><span className="font-medium text-slate-900">Phone:</span> {selectedUser.phone ?? "-"}</p>
                    <p><span className="font-medium text-slate-900">Auth:</span> {selectedUser.authProvider ?? "UNKNOWN"}</p>
                    <p><span className="font-medium text-slate-900">Joined:</span> {formatDate(selectedUser.createdAt)}</p>
                    <p><span className="font-medium text-slate-900">Last Active:</span> {selectedUser.lastActiveAt ? formatDate(selectedUser.lastActiveAt) : "-"}</p>
                  </div>
                </AdminPanelCard>
                <AdminPanelCard title="Profile" className="border-slate-100 shadow-none">
                  <div className="grid gap-2 text-sm text-slate-600">
                    <p><span className="font-medium text-slate-900">Country:</span> {selectedUser.country}</p>
                    <p><span className="font-medium text-slate-900">City:</span> {selectedUser.city ?? "-"}</p>
                    <p><span className="font-medium text-slate-900">Locale:</span> {selectedUser.preferredLocale ?? "-"}</p>
                    <p><span className="font-medium text-slate-900">Timezone:</span> {selectedUser.preferredTimezone ?? "-"}</p>
                    <p><span className="font-medium text-slate-900">Verified:</span> {selectedUser.isVerified ? "Yes" : "No"}</p>
                    <p><span className="font-medium text-slate-900">Profile Score:</span> {formatNumber(Number(detail?.profile?.profileCompletenessScore ?? 0))}%</p>
                    <p><span className="font-medium text-slate-900">Bio:</span> {detail?.profile?.bio ?? "-"}</p>
                  </div>
                </AdminPanelCard>
              </div>
            ) : null}

            {detailTab === "wallet" ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <AdminMetricCard label="Coin Balance" value={formatNumber(Number(detail?.wallet?.coinBalance ?? 0))} icon={WalletCards} />
                  <AdminMetricCard label="Diamond Balance" value={formatNumber(Number(detail?.wallet?.diamondBalance ?? 0))} icon={WalletCards} tone="sky" />
                  <AdminMetricCard label="Coins Purchased" value={formatNumber(Number(detail?.wallet?.lifetimeCoinsPurchased ?? 0))} icon={WalletCards} tone="amber" />
                  <AdminMetricCard label="Diamonds Earned" value={formatNumber(Number(detail?.wallet?.lifetimeDiamondsEarned ?? 0))} icon={WalletCards} tone="emerald" />
                </div>
                <AdminPanelCard title="Manual Wallet Adjustment" className="border-slate-100 shadow-none">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="Coin delta"><AdminInput type="number" value={walletAdjust.coinDelta} onChange={(event) => setWalletAdjust((current) => ({ ...current, coinDelta: event.target.value }))} /></AdminField>
                    <AdminField label="Diamond delta"><AdminInput type="number" value={walletAdjust.diamondDelta} onChange={(event) => setWalletAdjust((current) => ({ ...current, diamondDelta: event.target.value }))} /></AdminField>
                    <div className="md:col-span-2"><AdminField label="Reason"><AdminInput value={walletAdjust.description} onChange={(event) => setWalletAdjust((current) => ({ ...current, description: event.target.value }))} placeholder="Why are you adjusting this wallet?" /></AdminField></div>
                  </div>
                  <div className="mt-4 flex justify-end"><AdminButton onClick={() => adjustWallet.mutate({ userId: selectedUser.id, coinDelta: Number(walletAdjust.coinDelta || 0), diamondDelta: Number(walletAdjust.diamondDelta || 0), description: walletAdjust.description || undefined })} disabled={adjustWallet.isPending}>{adjustWallet.isPending ? "Applying..." : "Apply adjustment"}</AdminButton></div>
                </AdminPanelCard>
              </div>
            ) : null}

            {detailTab === "access" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <AdminPanelCard title="Permissions" className="border-slate-100 shadow-none">
                  <div className="grid gap-4">
                    <AdminField label="Role">
                      <AdminSelect value={selectedUser.role} onChange={(event) => updateUserRole.mutate({ userId: selectedUser.id, role: event.target.value })}>
                        {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </AdminSelect>
                    </AdminField>
                    <AdminField label="Status">
                      <AdminSelect value={selectedUser.status} onChange={(event) => updateUserStatus.mutate({ userId: selectedUser.id, status: event.target.value })}>
                        {STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                      </AdminSelect>
                    </AdminField>
                  </div>
                </AdminPanelCard>
                <AdminPanelCard title="VIP Grant" className="border-slate-100 shadow-none">
                  <div className="grid gap-4">
                    <AdminField label="Tier Code"><AdminInput value={vipGrant.tierCode} onChange={(event) => setVipGrant((current) => ({ ...current, tierCode: event.target.value }))} /></AdminField>
                    <AdminField label="Duration Days"><AdminInput type="number" value={vipGrant.durationDays} onChange={(event) => setVipGrant((current) => ({ ...current, durationDays: event.target.value }))} /></AdminField>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <AdminStatusPill value={selectedUser.status} />
                    <AdminButton onClick={() => grantVip.mutate({ userId: selectedUser.id, tierCode: vipGrant.tierCode, durationDays: Number(vipGrant.durationDays || 30) })} disabled={grantVip.isPending}>{grantVip.isPending ? "Granting..." : "Grant VIP"}</AdminButton>
                  </div>
                </AdminPanelCard>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading user details...</p>
        )}
      </AdminModal>
    </div>
  );
}
