"use client";

import { useState } from "react";
import { Shield, Users, Lock, ShieldCheck } from "lucide-react";
import {
  AdminButton, AdminDataTable, AdminMetricCard, AdminPageHeader, AdminPanelCard,
  AdminSearchField, AdminStatusPill,
} from "@/features/admin/components/admin-ui";

type RoleRow = {
  key: string;
  label: string;
  description: string;
  usersCount: number;
  permissions: string[];
  isSystem: boolean;
};

const ROLES: RoleRow[] = [
  { key: "USER", label: "User", description: "Regular platform user. Can browse, match, chat, send gifts.", usersCount: 0, permissions: ["chat", "gift_send", "match", "profile_edit"], isSystem: true },
  { key: "HOST", label: "Host / Model", description: "Content creator who can go live, receive gifts, earn diamonds.", usersCount: 0, permissions: ["chat", "live_stream", "receive_gifts", "withdraw"], isSystem: true },
  { key: "MODEL_INDEPENDENT", label: "Independent Host", description: "Self-registered host with H-ID. No agency affiliation.", usersCount: 0, permissions: ["chat", "live_stream", "receive_gifts", "withdraw", "profile_edit"], isSystem: true },
  { key: "MODEL_AGENCY", label: "Agency Host", description: "Host registered under an agency with AH-ID. Agency earns commission.", usersCount: 0, permissions: ["chat", "live_stream", "receive_gifts"], isSystem: true },
  { key: "AGENCY", label: "Agency", description: "Organization that manages multiple hosts and earns commission.", usersCount: 0, permissions: ["agency_dashboard", "manage_hosts", "view_earnings", "withdraw"], isSystem: true },
  { key: "ADMIN", label: "Admin", description: "Full platform control. Can manage users, hosts, agencies, settings, and all system configurations.", usersCount: 0, permissions: ["*"], isSystem: true },
];

const PERMISSION_GROUPS = {
  "User Actions": ["chat", "gift_send", "match", "profile_edit", "call_audio", "call_video"],
  "Host Actions": ["live_stream", "receive_gifts", "withdraw", "schedule_stream"],
  "Agency Actions": ["agency_dashboard", "manage_hosts", "view_earnings", "agency_settings"],
  "Admin Actions": ["manage_users", "manage_hosts_admin", "manage_agencies", "manage_gifts", "manage_settings", "view_audit_log", "manage_feature_flags", "manage_sub_admins"],
};

export default function RolesPage() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);

  const filtered = ROLES.filter((r) => !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.key.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Staff Management"
        title="Roles & Permissions"
        description="Platform role definitions and permission mappings. Roles are system-defined and enforced at the API layer."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Roles" value={String(ROLES.length)} icon={Shield} />
        <AdminMetricCard label="System Roles" value={String(ROLES.filter((r) => r.isSystem).length)} icon={Lock} tone="amber" />
        <AdminMetricCard label="Permission Groups" value={String(Object.keys(PERMISSION_GROUPS).length)} icon={ShieldCheck} tone="emerald" />
        <AdminMetricCard label="Total Permissions" value={String(Object.values(PERMISSION_GROUPS).flat().length)} icon={Users} tone="sky" />
      </div>

      <AdminPanelCard
        title="Platform Roles"
        subtitle="All roles are enforced at the tRPC middleware level (adminProcedure, agencyProcedure, hostProcedure)."
        actions={<div className="w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search roles..." /></div>}
      >
        <AdminDataTable
          rows={filtered}
          rowKey={(r) => r.key}
          emptyMessage="No roles found."
          columns={[
            { key: "key", label: "Role Key", sortable: true, render: (r) => <span className="font-mono text-xs font-bold text-violet-700">{r.key}</span> },
            { key: "label", label: "Label", sortable: true, render: (r) => <span className="font-semibold">{r.label}</span> },
            { key: "description", label: "Description", render: (r) => <span className="text-xs text-slate-500">{r.description}</span> },
            { key: "permissions", label: "Permissions", render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.permissions.slice(0, 4).map((p) => (
                  <span key={p} className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{p}</span>
                ))}
                {r.permissions.length > 4 && <span className="text-xs text-slate-400">+{r.permissions.length - 4}</span>}
              </div>
            )},
            { key: "isSystem", label: "Type", render: (r) => <AdminStatusPill value={r.isSystem ? "SYSTEM" : "CUSTOM"} /> },
            { key: "actions", label: "", render: (r) => <AdminButton variant="ghost" onClick={() => setSelectedRole(r)}>View</AdminButton> },
          ]}
        />
      </AdminPanelCard>

      {selectedRole && (
        <AdminPanelCard title={`Role: ${selectedRole.label}`} subtitle={selectedRole.description}>
          <div className="space-y-4 p-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Assigned Permissions</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRole.permissions.map((p) => (
                  <span key={p} className="inline-flex rounded-md bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">{p}</span>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">All Permission Groups</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                  <div key={group} className="rounded-lg border border-slate-200 p-3">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group}</h5>
                    <div className="flex flex-wrap gap-1">
                      {perms.map((p) => {
                        const has = selectedRole.permissions.includes("*") || selectedRole.permissions.includes(p);
                        return (
                          <span key={p} className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${has ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}>{p}</span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminPanelCard>
      )}
    </div>
  );
}
