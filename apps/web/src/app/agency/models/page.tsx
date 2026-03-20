"use client";

import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function AgencyModelsPage() {
  const roster = trpc.agency.getHostRoster.useQuery({ limit: 50 }, { retry: false });
  const agencyDashboard = trpc.agency.getAgencyDashboard.useQuery(undefined, { retry: false });
  const invite = trpc.agency.inviteHost.useMutation({
    onSuccess: () => void roster.refetch(),
  });
  const remove = trpc.agency.removeHost.useMutation({
    onSuccess: () => void roster.refetch(),
  });

  const rows = useMemo(() => (roster.data?.items ?? []) as Record<string, unknown>[], [roster.data?.items]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [hostUserId, setHostUserId] = useState("");
  const [error, setError] = useState("");

  const submitInvite = () => {
    const trimmed = hostUserId.trim();
    if (!trimmed) {
      setError("Model user ID is required.");
      return;
    }
    setError("");
    invite.mutate({ hostUserId: trimmed });
  };

  return (
    <>
      <PageHeader
        title="Models"
        description="Manage models under your agency roster and share your approved agency code with agency-based models."
        actions={(
          <Button onClick={() => setInviteOpen(true)}>Invite Model</Button>
        )}
      />

      <Card title="Agency Access Code" className="mb-6">
        <div className="flex flex-col gap-2 text-sm text-gray-700 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Model Onboarding</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{String((agencyDashboard.data?.agency as Record<string, unknown> | undefined)?.agencyCode ?? "Pending approval")}</div>
          </div>
          <div className="max-w-xl text-gray-600">
            Agency-based models must enter this code in the mobile onboarding flow. Access is blocked until the agency has been approved.
          </div>
        </div>
      </Card>

      <Card title="Agency Roster">
        <DataTable
          columns={[
            { key: "displayName", label: "Model" },
            { key: "userId", label: "User ID", render: (row) => String(row.userId ?? "").slice(0, 12) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
            { key: "qualityScore", label: "Quality", render: (row) => String(row.qualityScore ?? "-") },
            { key: "assignedAt", label: "Joined", render: (row) => row.assignedAt ? formatDate(String(row.assignedAt)) : "-" },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ hostUserId: String(row.userId) })}
                  >
                    Remove
                  </Button>
                </div>
              ),
            },
          ]}
          data={rows}
        />
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite model to your agency">
        <div className="space-y-4">
          <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
            Add an existing model by their <span className="font-semibold">User ID</span>. The API will validate that the user is a model.
          </div>

          <Input
            label="Model User ID"
            value={hostUserId}
            onChange={(e) => setHostUserId(e.target.value)}
            placeholder="e.g. 0f3a0c2d-...."
          />

          {error ? <div className="text-sm text-danger">{error}</div> : null}
          {invite.error ? <div className="text-sm text-danger">{String(invite.error.message ?? invite.error)}</div> : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button disabled={invite.isPending} onClick={submitInvite}>
              {invite.isPending ? "Inviting..." : "Invite"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

