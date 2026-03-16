"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, Modal, PageHeader, Select, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  displayName: string;
  avatarUrl?: string | null;
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
const ROLE_OPTIONS = ["USER", "HOST", "MODEL", "ADMIN"];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);

  useEffect(() => {
    setPageIndex(0);
    setCursorStack([undefined]);
  }, [search, statusFilter]);

  const listUsers = trpc.admin.listUsers.useQuery(
    {
      cursor: cursorStack[pageIndex],
      limit: 20,
      search: search.trim() || undefined,
    },
    { retry: false },
  );

  const userDetail = trpc.admin.getUserDetail.useQuery(
    { userId: selectedUserId ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: !!selectedUserId },
  );

  const updateUserStatus = trpc.admin.updateUserStatus.useMutation({
    onSuccess: async () => {
      await listUsers.refetch();
      await userDetail.refetch();
    },
  });

  const updateUserRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      await listUsers.refetch();
      await userDetail.refetch();
    },
  });

  const rawRows = (listUsers.data?.items ?? []) as UserRow[];
  const rows = statusFilter === "ALL"
    ? rawRows
    : rawRows.filter((row) => row.status === statusFilter);

  const selectedUser = (userDetail.data ?? null) as UserDetail | null;

  function handleNextPage() {
    if (!listUsers.data?.nextCursor) return;

    setCursorStack((current) => {
      const next = [...current];
      next[pageIndex + 1] = listUsers.data?.nextCursor;
      return next;
    });
    setPageIndex((current) => current + 1);
  }

  return (
    <>
      <PageHeader title="User Management" description="Search users, inspect account state, and apply moderation or role changes." />

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          placeholder="Search by display name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={STATUS_OPTIONS.map((status) => ({
            value: status,
            label: status === "ALL" ? "All statuses" : status.replaceAll("_", " "),
          }))}
        />
      </div>

      <DataTable
        columns={[
          { key: "id", label: "User", render: (row) => <span className="font-medium">{String(row.displayName || row.id)}</span> },
          { key: "email", label: "Email" },
          { key: "role", label: "Role", render: (row) => String(row.role).toLowerCase() },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: "createdAt", label: "Joined", render: (row) => formatDate(String(row.createdAt)) },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserId(String(row.id))}>
                View
              </Button>
            ),
          },
        ]}
        data={rows as Record<string, unknown>[]}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {pageIndex + 1} • {formatNumber(rows.length)} visible user{rows.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => Math.max(0, current - 1))}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={!listUsers.data?.nextCursor} onClick={handleNextPage}>
            Next
          </Button>
        </div>
      </div>

      <UserDetailModal
        detail={selectedUser}
        isLoading={userDetail.isLoading}
        isUpdatingStatus={updateUserStatus.isPending}
        isUpdatingRole={updateUserRole.isPending}
        onChangeRole={(role) => {
          if (!selectedUser?.user?.id) return;
          updateUserRole.mutate({ userId: selectedUser.user.id, role });
        }}
        onChangeStatus={(status) => {
          if (!selectedUser?.user?.id) return;
          updateUserStatus.mutate({ userId: selectedUser.user.id, status });
        }}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
}

function UserDetailModal({
  detail,
  isLoading,
  isUpdatingStatus,
  isUpdatingRole,
  onChangeRole,
  onChangeStatus,
  onClose,
}: {
  detail: UserDetail | null;
  isLoading: boolean;
  isUpdatingStatus: boolean;
  isUpdatingRole: boolean;
  onChangeRole: (role: string) => void;
  onChangeStatus: (status: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("profile");
  const isOpen = isLoading || !!detail?.user;
  const user = detail?.user;
  const wallet = detail?.wallet;
  const profile = detail?.profile;

  return (
    <Modal open={isOpen} onClose={onClose} title={user ? `User: ${user.displayName}` : "Loading user"}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading user details...</p>
      ) : user ? (
        <div className="space-y-4">
          <Tabs
            tabs={[
              { id: "profile", label: "Profile" },
              { id: "wallet", label: "Wallet" },
              { id: "actions", label: "Actions" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "profile" ? (
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <Card title="Account">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                  <p><span className="text-muted-foreground">Username:</span> {user.username}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {user.phone || "-"}</p>
                  <p><span className="text-muted-foreground">Joined:</span> {formatDate(user.createdAt)}</p>
                  <p><span className="text-muted-foreground">Last active:</span> {user.lastActiveAt ? formatDate(user.lastActiveAt) : "-"}</p>
                </div>
              </Card>
              <Card title="Profile">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Country:</span> {user.country}</p>
                  <p><span className="text-muted-foreground">City:</span> {user.city || "-"}</p>
                  <p><span className="text-muted-foreground">Locale:</span> {user.preferredLocale || "-"}</p>
                  <p><span className="text-muted-foreground">Timezone:</span> {user.preferredTimezone || "-"}</p>
                  <p><span className="text-muted-foreground">Verified:</span> {user.isVerified ? "Yes" : "No"}</p>
                  <p><span className="text-muted-foreground">Completeness:</span> {formatNumber(Number(profile?.profileCompletenessScore ?? 0))}%</p>
                  <p><span className="text-muted-foreground">Bio:</span> {profile?.bio || "-"}</p>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === "wallet" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Card title="Current Balances">
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Coins:</span> {formatNumber(Number(wallet?.coinBalance ?? 0))}</p>
                  <p><span className="text-muted-foreground">Diamonds:</span> {formatNumber(Number(wallet?.diamondBalance ?? 0))}</p>
                </div>
              </Card>
              <Card title="Lifetime Totals">
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Coins Purchased:</span> {formatNumber(Number(wallet?.lifetimeCoinsPurchased ?? 0))}</p>
                  <p><span className="text-muted-foreground">Coins Spent:</span> {formatNumber(Number(wallet?.lifetimeCoinsSpent ?? 0))}</p>
                  <p><span className="text-muted-foreground">Diamonds Earned:</span> {formatNumber(Number(wallet?.lifetimeDiamondsEarned ?? 0))}</p>
                  <p><span className="text-muted-foreground">Diamonds Withdrawn:</span> {formatNumber(Number(wallet?.lifetimeDiamondsWithdrawn ?? 0))}</p>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === "actions" ? (
            <div className="space-y-4">
              <Card title="Current State">
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <p className="mb-2 text-muted-foreground">Role</p>
                    <Select
                      value={user.role}
                      disabled={isUpdatingRole}
                      onChange={(event) => onChangeRole(event.target.value)}
                      options={ROLE_OPTIONS.map((role) => ({ value: role, label: role }))}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground">Status</p>
                    <Select
                      value={user.status}
                      disabled={isUpdatingStatus}
                      onChange={(event) => onChangeStatus(event.target.value)}
                      options={STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => ({
                        value: status,
                        label: status.replaceAll("_", " "),
                      }))}
                    />
                  </div>
                </div>
              </Card>
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={user.status} />
                <span className="text-muted-foreground">Role: {user.role}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">User not found.</p>
      )}
    </Modal>
  );
}
