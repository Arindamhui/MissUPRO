"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { ImageIcon, LayoutTemplate, PanelTop, Sparkles } from "lucide-react";

export default function HomepagePage() {
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    imageUrl: "",
    linkType: "DEEP_LINK",
    linkTarget: "/events",
    position: "0",
  });
  const [sectionForm, setSectionForm] = useState({
    sectionType: "PROMO_SLIDER",
    position: "0",
    status: "ACTIVE",
    configJson: "{\"title\":\"Featured\"}",
  });
  const [layoutForm, setLayoutForm] = useState({
    layoutName: "mobile-home-default",
    platform: "MOBILE",
    sectionsJson: "[\"hero\",\"campaign_banners\",\"trending\"]",
  });

  const sectionsQuery = trpc.cms.listHomepageSections.useQuery(undefined, { retry: false });
  const bannersQuery = trpc.cms.listBanners.useQuery(undefined, { retry: false });
  const layoutsQuery = trpc.admin.listUiLayoutConfigs.useQuery(undefined, { retry: false });

  const createBanner = trpc.cms.createBanner.useMutation({
    onSuccess: () => {
      setShowBannerModal(false);
      void bannersQuery.refetch();
    },
  });
  const upsertSection = trpc.cms.upsertHomepageSection.useMutation({
    onSuccess: () => {
      setShowSectionModal(false);
      void sectionsQuery.refetch();
    },
  });
  const upsertLayout = trpc.admin.upsertUiLayoutConfig.useMutation({
    onSuccess: () => {
      setShowLayoutModal(false);
      void layoutsQuery.refetch();
    },
  });

  const sections = (sectionsQuery.data ?? []) as Record<string, unknown>[];
  const banners = (bannersQuery.data ?? []) as Record<string, unknown>[];
  const layouts = (layoutsQuery.data ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Homepage Layout"
        description="Manage homepage sections, campaign banners, and server-driven UI layout payloads."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowLayoutModal(true)}>Add Layout</Button>
            <Button variant="secondary" onClick={() => setShowSectionModal(true)}>Add Section</Button>
            <Button onClick={() => setShowBannerModal(true)}>Create Banner</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Homepage Sections" value={sections.length} icon={PanelTop} />
        <KpiCard label="Banners" value={banners.length} icon={ImageIcon} />
        <KpiCard label="Layouts" value={layouts.length} icon={LayoutTemplate} />
        <KpiCard label="Active Sections" value={sections.filter((row) => String(row.status) === "ACTIVE").length} icon={Sparkles} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Homepage Sections">
          <DataTable
            columns={[
              { key: "sectionType", label: "Section" },
              { key: "position", label: "Position" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
              {
                key: "configJson",
                label: "Config",
                render: (row) => <span className="text-xs text-muted-foreground">{JSON.stringify(row.configJson).slice(0, 60)}</span>,
              },
            ]}
            data={sections}
          />
        </Card>

        <Card title="Campaign Banners">
          <DataTable
            columns={[
              { key: "title", label: "Title" },
              { key: "linkType", label: "Link Type" },
              { key: "position", label: "Position" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "INACTIVE")} /> },
              {
                key: "updatedAt",
                label: "Updated",
                render: (row) => row.updatedAt ? formatDate(String(row.updatedAt)) : "-",
              },
            ]}
            data={banners}
          />
        </Card>

        <Card title="UI Layout Configs">
          <DataTable
            columns={[
              { key: "layoutName", label: "Layout" },
              { key: "platform", label: "Platform" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "DRAFT")} /> },
              { key: "version", label: "Version" },
              {
                key: "sectionsJson",
                label: "Sections",
                render: (row) => <span className="text-xs text-muted-foreground">{JSON.stringify(row.sectionsJson).slice(0, 60)}</span>,
              },
            ]}
            data={layouts}
          />
        </Card>
      </div>

      <Modal open={showBannerModal} onClose={() => setShowBannerModal(false)} title="Create Campaign Banner">
        <div className="space-y-4">
          <Input label="Title" value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} />
          <Input label="Image URL" value={bannerForm.imageUrl} onChange={(event) => setBannerForm((current) => ({ ...current, imageUrl: event.target.value }))} />
          <Input label="Link Type" value={bannerForm.linkType} onChange={(event) => setBannerForm((current) => ({ ...current, linkType: event.target.value }))} />
          <Input label="Link Target" value={bannerForm.linkTarget} onChange={(event) => setBannerForm((current) => ({ ...current, linkTarget: event.target.value }))} />
          <Input label="Position" type="number" value={bannerForm.position} onChange={(event) => setBannerForm((current) => ({ ...current, position: event.target.value }))} />
          <div className="flex gap-2">
            <Button
              disabled={createBanner.isPending}
              onClick={() => createBanner.mutate({
                title: bannerForm.title,
                imageUrl: bannerForm.imageUrl,
                linkType: bannerForm.linkType,
                linkTarget: bannerForm.linkTarget,
                position: Number(bannerForm.position),
              })}
            >
              Save Banner
            </Button>
            <Button variant="secondary" onClick={() => setShowBannerModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showSectionModal} onClose={() => setShowSectionModal(false)} title="Create Homepage Section">
        <div className="space-y-4">
          <Input label="Section Type" value={sectionForm.sectionType} onChange={(event) => setSectionForm((current) => ({ ...current, sectionType: event.target.value }))} />
          <Input label="Position" type="number" value={sectionForm.position} onChange={(event) => setSectionForm((current) => ({ ...current, position: event.target.value }))} />
          <Input label="Status" value={sectionForm.status} onChange={(event) => setSectionForm((current) => ({ ...current, status: event.target.value }))} />
          <div>
            <label className="block text-sm font-medium mb-1">Config JSON</label>
            <textarea
              className="w-full min-h-32 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={sectionForm.configJson}
              onChange={(event) => setSectionForm((current) => ({ ...current, configJson: event.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={upsertSection.isPending}
              onClick={() => upsertSection.mutate({
                sectionType: sectionForm.sectionType,
                position: Number(sectionForm.position),
                status: sectionForm.status,
                configJson: JSON.parse(sectionForm.configJson),
              })}
            >
              Save Section
            </Button>
            <Button variant="secondary" onClick={() => setShowSectionModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showLayoutModal} onClose={() => setShowLayoutModal(false)} title="Publish UI Layout">
        <div className="space-y-4">
          <Input label="Layout Name" value={layoutForm.layoutName} onChange={(event) => setLayoutForm((current) => ({ ...current, layoutName: event.target.value }))} />
          <Input label="Platform" value={layoutForm.platform} onChange={(event) => setLayoutForm((current) => ({ ...current, platform: event.target.value }))} />
          <div>
            <label className="block text-sm font-medium mb-1">Sections JSON</label>
            <textarea
              className="w-full min-h-32 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={layoutForm.sectionsJson}
              onChange={(event) => setLayoutForm((current) => ({ ...current, sectionsJson: event.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={upsertLayout.isPending}
              onClick={() => upsertLayout.mutate({
                layoutName: layoutForm.layoutName,
                sectionsJson: JSON.parse(layoutForm.sectionsJson),
                platform: layoutForm.platform as "MOBILE" | "WEB" | "ALL",
              })}
            >
              Publish Layout
            </Button>
            <Button variant="secondary" onClick={() => setShowLayoutModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
