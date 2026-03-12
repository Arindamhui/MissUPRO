"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Input, Select, Card, Modal, Tabs } from "@/components/ui";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const users = trpc.admin.listUsers.useQuery(
    { search: search || undefined, status: statusFilter === "all" ? undefined : statusFilter, limit: 20, offset: (page - 1) * 20 },
    { retry: false },
  );

  const rows = (users.data?.users ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="User Management" description="Search, view, and manage all platform users" />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input placeholder="Search by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "blocked", label: "Blocked" },
          ]}
        />
      </div>

      {/* Users Table */}
      <DataTable
        columns={[
          { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
          { key: "displayName", label: "Name" },
          { key: "email", label: "Email" },
          { key: "country", label: "Country" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
          { key: "createdAt", label: "Joined", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
          { key: "actions", label: "", render: (r) => (
            <Button size="sm" variant="ghost" onClick={() => setSelectedUser(r)}>View</Button>
          )},
        ]}
        data={rows}
      />

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-muted-foreground">{users.data?.total ?? 0} users total</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>

      {/* User Detail Modal */}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </>
  );
}

function UserDetailModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [tab, setTab] = useState("profile");

  if (!user) return null;

  return (
    <Modal open={!!user} onClose={onClose} title={`User: ${user.displayName ?? user.id}`}>
      <Tabs
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "wallet", label: "Wallet" },
          { id: "history", label: "Call History" },
          { id: "payments", label: "Payments" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "profile" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
            <div><span className="text-muted-foreground">Country:</span> {user.country ?? "-"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={String(user.status ?? "active")} /></div>
            <div><span className="text-muted-foreground">Joined:</span> {user.createdAt ? formatDate(String(user.createdAt)) : "-"}</div>
            <div><span className="text-muted-foreground">Level:</span> {user.level ?? 1}</div>
            <div><span className="text-muted-foreground">VIP:</span> {user.vipTier ?? "None"}</div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="secondary" size="sm">Suspend</Button>
            <Button variant="danger" size="sm">Block</Button>
            <Button variant="secondary" size="sm">Restore</Button>
          </div>
        </div>
      )}

      {tab === "wallet" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card title="Coins"><p className="text-2xl font-bold">{formatNumber(user.coinBalance ?? 0)}</p></Card>
            <Card title="Diamonds"><p className="text-2xl font-bold">{formatNumber(user.diamondBalance ?? 0)}</p></Card>
          </div>
          <p className="text-sm text-muted-foreground">Transaction ledger available via API</p>
        </div>
      )}

      {tab === "history" && (
        <p className="text-sm text-muted-foreground">Call history will load from admin.getUserCallHistory</p>
      )}

      {tab === "payments" && (
        <p className="text-sm text-muted-foreground">Payment records will load from admin.getUserPaymentHistory</p>
      )}
    </Modal>
  );
}
