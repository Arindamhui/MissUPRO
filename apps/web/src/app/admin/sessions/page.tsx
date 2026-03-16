"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, Button, Input, Card } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function AdminSessionsPage() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const sessions = trpc.security.listSessions.useQuery(
    { userId: userIdFilter.trim() || undefined, cursor, limit: 25 },
    { retry: false },
  );
  const revokeMut = trpc.security.revokeSessionByAdmin.useMutation({
    onSuccess: () => sessions.refetch(),
  });

  const items = (sessions.data?.items ?? []) as Array<{
    id: string;
    userId: string;
    sessionStatus: string;
    lastSeenAt: string | null;
    expiresAt: string;
    createdAt: string;
    userEmail: string | null;
    userDisplayName: string | null;
  }>;

  return (
    <>
      <PageHeader
        title="Session monitoring"
        description="View and revoke user sessions. Security events are logged for admin revokes."
      />
      <Card title="Sessions">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Filter by user ID (UUID)"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="secondary" onClick={() => sessions.refetch()}>Refresh</Button>
          </div>
          <DataTable
            columns={[
              { key: "id", label: "Session ID", render: (r) => String(r.id).slice(0, 8) + "…" },
              { key: "userDisplayName", label: "User", render: (r) => r.userDisplayName ?? r.userEmail ?? r.userId?.slice(0, 8) ?? "-" },
              { key: "userEmail", label: "Email", render: (r) => r.userEmail ?? "-" },
              { key: "sessionStatus", label: "Status" },
              { key: "lastSeenAt", label: "Last seen", render: (r) => r.lastSeenAt ? formatDate(String(r.lastSeenAt)) : "-" },
              { key: "expiresAt", label: "Expires", render: (r) => formatDate(String(r.expiresAt)) },
              { key: "createdAt", label: "Created", render: (r) => formatDate(String(r.createdAt)) },
              {
                key: "actions",
                label: "",
                render: (r) =>
                  r.sessionStatus === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => revokeMut.mutate({ sessionId: r.id })}
                      disabled={revokeMut.isPending}
                    >
                      Revoke
                    </Button>
                  ) : null,
              },
            ]}
            data={items}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{items.length} sessions shown</p>
            {sessions.data?.nextCursor && (
              <Button variant="secondary" size="sm" onClick={() => setCursor(sessions.data!.nextCursor!)}>
                Load more
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
