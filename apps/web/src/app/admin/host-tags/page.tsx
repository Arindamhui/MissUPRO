"use client";

import { useState } from "react";
import { Tag, Hash, Plus } from "lucide-react";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSearchField, AdminStatusPill,
} from "@/features/admin/components/admin-ui";

type TagItem = {
  id: string;
  name: string;
  color: string;
  hostsCount: number;
  isActive: boolean;
};

const PRESET_COLORS = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#6366f1", "#14b8a6"];

export default function HostTagsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTag, setEditTag] = useState<TagItem | null>(null);
  const [form, setForm] = useState({ name: "", color: "#7c3aed" });

  // Static demo data — wire to backend when host_tags table+endpoints are created
  const [tags, setTags] = useState<TagItem[]>([
    { id: "1", name: "New", color: "#7c3aed", hostsCount: 58, isActive: true },
    { id: "2", name: "Top Earner", color: "#ec4899", hostsCount: 12, isActive: true },
    { id: "3", name: "Rising Star", color: "#f59e0b", hostsCount: 33, isActive: true },
    { id: "4", name: "Verified ID", color: "#10b981", hostsCount: 140, isActive: true },
    { id: "5", name: "Premium", color: "#3b82f6", hostsCount: 25, isActive: true },
    { id: "6", name: "Suspended", color: "#ef4444", hostsCount: 4, isActive: false },
  ]);

  const filtered = tags.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  function openCreate() { setEditTag(null); setForm({ name: "", color: "#7c3aed" }); setShowModal(true); }
  function openEdit(tag: TagItem) { setEditTag(tag); setForm({ name: tag.name, color: tag.color }); setShowModal(true); }
  function save() {
    if (editTag) {
      setTags((prev) => prev.map((t) => t.id === editTag.id ? { ...t, name: form.name, color: form.color } : t));
    } else {
      const newTag: TagItem = { id: String(Date.now()), name: form.name, color: form.color, hostsCount: 0, isActive: true };
      setTags((prev) => [...prev, newTag]);
    }
    setShowModal(false);
  }
  function toggleActive(tag: TagItem) {
    setTags((prev) => prev.map((t) => t.id === tag.id ? { ...t, isActive: !t.isActive } : t));
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Host & Agency"
        title="Host Tags"
        description="Manage categorization tags for hosts. Tags are displayed on host profiles and used for filtering."
        actions={<AdminButton onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Create Tag</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard label="Total Tags" value={String(tags.length)} icon={Tag} />
        <AdminMetricCard label="Active Tags" value={String(tags.filter((t) => t.isActive).length)} icon={Hash} tone="emerald" />
        <AdminMetricCard label="Total Assignments" value={String(tags.reduce((s, t) => s + t.hostsCount, 0))} icon={Tag} tone="sky" />
      </div>

      <AdminPanelCard
        title="Tag Registry"
        subtitle="All host categorization tags."
        actions={<div className="w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search tags..." /></div>}
      >
        <AdminDataTable
          rows={filtered}
          rowKey={(r) => r.id}
          emptyMessage="No tags found."
          columns={[
            { key: "color", label: "", render: (r) => <span className="inline-block h-5 w-5 rounded-full border border-white/30" style={{ background: r.color }} /> },
            { key: "name", label: "Tag Name", sortable: true, render: (r) => <span className="font-semibold">{r.name}</span> },
            { key: "hostsCount", label: "Hosts", sortable: true, render: (r) => String(r.hostsCount) },
            { key: "isActive", label: "Status", render: (r) => <AdminStatusPill value={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
            { key: "actions", label: "", render: (r) => (
              <div className="flex gap-2">
                <AdminButton variant="ghost" onClick={() => openEdit(r)}>Edit</AdminButton>
                <AdminButton variant="ghost" onClick={() => toggleActive(r)}>{r.isActive ? "Disable" : "Enable"}</AdminButton>
              </div>
            )},
          ]}
        />
      </AdminPanelCard>

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title={editTag ? "Edit Tag" : "Create Tag"}>
        <div className="space-y-4">
          <AdminField label="Tag Name"><AdminInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Top Earner" /></AdminField>
          <AdminField label="Color">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? "border-white ring-2 ring-violet-500" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 p-0" />
            </div>
          </AdminField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</AdminButton>
          <AdminButton onClick={save} disabled={!form.name.trim()}>Save Tag</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
