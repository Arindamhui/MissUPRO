"use client";

import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function AgencySettingsPage() {
  const dashboard = trpc.agency.getAgencyDashboard.useQuery(undefined, { retry: false });
  const myApplications = trpc.agency.listMyApplications.useQuery(undefined, { retry: false });
  const applyAsAgency = trpc.agency.applyAsAgency.useMutation({
    onSuccess: () => {
      void dashboard.refetch();
    },
  });
  const submitApplication = trpc.agency.submitApplication.useMutation({
    onSuccess: () => void myApplications.refetch(),
  });

  const agency = (dashboard.data as any)?.agency;
  const applications = useMemo(
    () => (myApplications.data ?? []) as Record<string, unknown>[],
    [myApplications.data],
  );

  const [name, setName] = useState(agency?.agencyName ?? "");
  const [contactName, setContactName] = useState(agency?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(agency?.contactEmail ?? "");
  const [country, setCountry] = useState(agency?.country ?? "");
  const [notes, setNotes] = useState("");

  const canSubmit = name.trim().length >= 2 && contactName.trim().length >= 2 && contactEmail.includes("@") && country.trim().length >= 2;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your agency profile and applications."
      />

      {dashboard.error ? (
        <Card title="Create your agency" className="mb-6">
          <div className="space-y-3">
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
              You don&apos;t have an active agency yet. Create one now to unlock the full MissU Pro agency dashboard.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Agency name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name" />
              <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
              <Input label="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
              <Input label="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@agency.com" />
            </div>

            {applyAsAgency.error ? (
              <div className="text-sm text-danger">{String(applyAsAgency.error.message ?? applyAsAgency.error)}</div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                disabled={!canSubmit || applyAsAgency.isPending}
                onClick={() =>
                  applyAsAgency.mutate({
                    name: name.trim(),
                    contactName: contactName.trim(),
                    contactEmail: contactEmail.trim(),
                    country: country.trim(),
                  })
                }
              >
                {applyAsAgency.isPending ? "Creating..." : "Create agency"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Agency details">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Agency</span>
              <span className="font-semibold">{agency?.agencyName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contact</span>
              <span className="font-semibold">{agency?.contactName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-semibold">{agency?.contactEmail ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Country</span>
              <span className="font-semibold">{agency?.country ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Commission tier</span>
              <span className="font-semibold">{agency?.commissionTier ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="font-semibold">{agency?.status ?? "—"}</span>
            </div>
          </div>
        </Card>

        <Card title="Submit agency application">
          <div className="space-y-3">
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
              If your agency requires manual approval, submit an application here. Admins can review applications in the MissU Pro admin panel.
            </div>

            <Input label="Agency name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name" />
            <Input label="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
            <Input label="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@agency.com" />
            <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />

            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us about your agency, team size, target markets, etc."
              />
            </div>

            {submitApplication.error ? (
              <div className="text-sm text-danger">{String(submitApplication.error.message ?? submitApplication.error)}</div>
            ) : null}

            <div className="flex justify-end">
              <Button
                disabled={!canSubmit || submitApplication.isPending}
                onClick={() => submitApplication.mutate({ name: name.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(), country: country.trim(), notes: notes.trim() || undefined })}
              >
                {submitApplication.isPending ? "Submitting..." : "Submit application"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="My applications">
          <DataTable
            columns={[
              { key: "agencyName", label: "Agency" },
              { key: "contactEmail", label: "Email" },
              { key: "country", label: "Country" },
              { key: "status", label: "Status", render: (row) => String(row.status ?? "PENDING") },
              { key: "createdAt", label: "Submitted", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
            ]}
            data={applications}
          />
        </Card>
      </div>
    </>
  );
}

