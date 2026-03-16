"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge } from "@/components/ui";
import { ImagePlus, Palette, Shapes, Sparkles } from "lucide-react";

type ThemeRow = Record<string, unknown>;

export default function ThemesPage() {
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeRow | null>(null);
  const [themeForm, setThemeForm] = useState({
    name: "",
    description: "",
    primaryColor: "#6C5CE7",
    secondaryColor: "#FF6B6B",
    backgroundColor: "#FFFFFF",
    cardBackgroundColor: "#FFFFFF",
    textPrimaryColor: "#1E1E2E",
    textSecondaryColor: "#777E90",
    accentGradientStart: "#6C5CE7",
    accentGradientEnd: "#FF6B6B",
  });
  const [assetForm, setAssetForm] = useState({
    assetType: "BACKGROUND",
    storageKey: "",
    mimeType: "image/png",
    sizeBytes: "0",
  });

  const themesQuery = trpc.cms.listThemes.useQuery(undefined, { retry: false });
  const assetsQuery = trpc.cms.getThemeAssets.useQuery(
    { themeId: String(selectedTheme?.id ?? "00000000-0000-0000-0000-000000000000") },
    { retry: false, enabled: !!selectedTheme?.id },
  );
  const createTheme = trpc.cms.createTheme.useMutation({
    onSuccess: () => {
      setShowThemeModal(false);
      void themesQuery.refetch();
    },
  });
  const addThemeAsset = trpc.cms.addThemeAsset.useMutation({
    onSuccess: () => {
      setShowAssetModal(false);
      void assetsQuery.refetch();
    },
  });

  const themes = (themesQuery.data ?? []) as ThemeRow[];
  const assets = (assetsQuery.data ?? []) as Record<string, unknown>[];
  const activeThemes = themes.filter((theme) => Boolean(theme.isActive));

  return (
    <>
      <PageHeader
        title="Themes"
        description="Configure brand themes, activation windows, and theme asset payloads for party rooms and profiles."
        actions={
          <>
            <Button variant="secondary" disabled={!selectedTheme} onClick={() => setShowAssetModal(true)}>
              Add Asset
            </Button>
            <Button onClick={() => setShowThemeModal(true)}>Create Theme</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Themes" value={themes.length} icon={Palette} />
        <KpiCard label="Active Themes" value={activeThemes.length} icon={Sparkles} />
        <KpiCard label="Theme Assets" value={assets.length} icon={ImagePlus} />
        <KpiCard label="Selectable Variants" value={themes.length} icon={Shapes} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <Card title="Theme Catalog">
          <DataTable
            columns={[
              { key: "name", label: "Theme" },
              { key: "description", label: "Description" },
              {
                key: "swatch",
                label: "Swatch",
                render: (row) => (
                  <div className="flex gap-2">
                    <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: String(row.primaryColor ?? "#6C5CE7") }} />
                    <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: String(row.secondaryColor ?? "#FF6B6B") }} />
                    <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: String(row.backgroundColor ?? "#FFFFFF") }} />
                  </div>
                ),
              },
              {
                key: "isActive",
                label: "Status",
                render: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />,
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedTheme(row)}
                  >
                    View Assets
                  </Button>
                ),
              },
            ]}
            data={themes}
          />
        </Card>

        <Card title={selectedTheme ? `Assets: ${String(selectedTheme.name ?? "Theme")}` : "Theme Assets"}>
          <DataTable
            columns={[
              { key: "assetType", label: "Type" },
              { key: "storageKey", label: "Storage Key" },
              { key: "mimeType", label: "MIME" },
              { key: "sizeBytes", label: "Bytes" },
            ]}
            data={assets}
          />
        </Card>
      </div>

      <Modal open={showThemeModal} onClose={() => setShowThemeModal(false)} title="Create Theme">
        <div className="space-y-4">
          <Input label="Name" value={themeForm.name} onChange={(event) => setThemeForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label="Description" value={themeForm.description} onChange={(event) => setThemeForm((current) => ({ ...current, description: event.target.value }))} />
          <Input label="Primary Color" value={themeForm.primaryColor} onChange={(event) => setThemeForm((current) => ({ ...current, primaryColor: event.target.value }))} />
          <Input label="Secondary Color" value={themeForm.secondaryColor} onChange={(event) => setThemeForm((current) => ({ ...current, secondaryColor: event.target.value }))} />
          <Input label="Background Color" value={themeForm.backgroundColor} onChange={(event) => setThemeForm((current) => ({ ...current, backgroundColor: event.target.value }))} />
          <Input label="Card Background Color" value={themeForm.cardBackgroundColor} onChange={(event) => setThemeForm((current) => ({ ...current, cardBackgroundColor: event.target.value }))} />
          <Input label="Text Primary Color" value={themeForm.textPrimaryColor} onChange={(event) => setThemeForm((current) => ({ ...current, textPrimaryColor: event.target.value }))} />
          <Input label="Text Secondary Color" value={themeForm.textSecondaryColor} onChange={(event) => setThemeForm((current) => ({ ...current, textSecondaryColor: event.target.value }))} />
          <Input label="Accent Gradient Start" value={themeForm.accentGradientStart} onChange={(event) => setThemeForm((current) => ({ ...current, accentGradientStart: event.target.value }))} />
          <Input label="Accent Gradient End" value={themeForm.accentGradientEnd} onChange={(event) => setThemeForm((current) => ({ ...current, accentGradientEnd: event.target.value }))} />
          <div className="flex gap-2">
            <Button
              disabled={createTheme.isPending}
              onClick={() => createTheme.mutate(themeForm)}
            >
              Save Theme
            </Button>
            <Button variant="secondary" onClick={() => setShowThemeModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAssetModal} onClose={() => setShowAssetModal(false)} title="Add Theme Asset">
        <div className="space-y-4">
          <Input label="Asset Type" value={assetForm.assetType} onChange={(event) => setAssetForm((current) => ({ ...current, assetType: event.target.value }))} />
          <Input label="Storage Key" value={assetForm.storageKey} onChange={(event) => setAssetForm((current) => ({ ...current, storageKey: event.target.value }))} />
          <Input label="MIME Type" value={assetForm.mimeType} onChange={(event) => setAssetForm((current) => ({ ...current, mimeType: event.target.value }))} />
          <Input label="Size Bytes" type="number" value={assetForm.sizeBytes} onChange={(event) => setAssetForm((current) => ({ ...current, sizeBytes: event.target.value }))} />
          <div className="flex gap-2">
            <Button
              disabled={!selectedTheme || addThemeAsset.isPending}
              onClick={() => {
                if (!selectedTheme) return;
                addThemeAsset.mutate({
                  themeId: String(selectedTheme.id),
                  assetType: assetForm.assetType,
                  storageKey: assetForm.storageKey,
                  mimeType: assetForm.mimeType,
                  sizeBytes: Number(assetForm.sizeBytes),
                });
              }}
            >
              Attach Asset
            </Button>
            <Button variant="secondary" onClick={() => setShowAssetModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
