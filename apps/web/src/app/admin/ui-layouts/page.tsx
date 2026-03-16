"use client";

import { useEffect, useMemo, useState } from "react";
import { AppWindow, LayoutTemplate, PanelTop, PanelsTopLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge } from "@/components/ui";

export default function UiLayoutsPage() {
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const [draggedPositionId, setDraggedPositionId] = useState("");
  const [editingLayoutId, setEditingLayoutId] = useState("");
  const [editingComponentId, setEditingComponentId] = useState("");

  const [layoutForm, setLayoutForm] = useState({
    layoutKey: "home_feed",
    layoutName: "Home Feed Mobile",
    screenKey: "home",
    platform: "MOBILE",
    environment: "development",
    regionCode: "",
    status: "PUBLISHED",
    version: "1",
    tabNavigationJson: "[]",
    metadataJson: "{\"description\":\"Dynamic mobile home\"}",
  });
  const [componentForm, setComponentForm] = useState({
    componentKey: "home_hero_banner",
    componentType: "BANNER",
    displayName: "Home Hero Banner",
    schemaVersion: "1",
    dataSourceKey: "",
    status: "PUBLISHED",
    propsJson: "{\"eyebrow\":\"Tonight\",\"title\":\"Dynamic home banner\",\"subtitle\":\"Delivered from the API\",\"ctaLabel\":\"Open trending\",\"ctaRoute\":\"/home/trending-live\"}",
  });
  const [positionsForm, setPositionsForm] = useState({
    layoutId: "",
    positionsJson: "[\n  {\n    \"componentId\": \"\",\n    \"sectionKey\": \"hero\",\n    \"slotKey\": \"primary\",\n    \"breakpoint\": \"default\",\n    \"positionIndex\": 0,\n    \"visibilityRulesJson\": {},\n    \"overridesJson\": {}\n  }\n]",
  });

  const layoutsQuery = trpc.admin.listUiLayouts.useQuery(undefined, { retry: false });
  const componentsQuery = trpc.admin.listUiComponents.useQuery(undefined, { retry: false });
  const positionsQuery = trpc.admin.listComponentPositions.useQuery(
    selectedLayoutId ? { layoutId: selectedLayoutId } : undefined,
    { retry: false },
  );

  const upsertLayout = trpc.admin.upsertUiLayout.useMutation({
    onSuccess: () => {
      setShowLayoutModal(false);
      void layoutsQuery.refetch();
    },
  });
  const upsertComponent = trpc.admin.upsertUiComponent.useMutation({
    onSuccess: () => {
      setShowComponentModal(false);
      void componentsQuery.refetch();
    },
  });
  const replacePositions = trpc.admin.replaceComponentPositions.useMutation({
    onSuccess: () => {
      setShowPositionsModal(false);
      void positionsQuery.refetch();
    },
  });

  const layouts = (layoutsQuery.data ?? []) as Record<string, unknown>[];
  const components = (componentsQuery.data ?? []) as Record<string, unknown>[];
  const positions = (positionsQuery.data ?? []) as Record<string, unknown>[];

  function resetLayoutForm() {
    setEditingLayoutId("");
    setLayoutForm({
      layoutKey: "home_feed",
      layoutName: "Home Feed Mobile",
      screenKey: "home",
      platform: "MOBILE",
      environment: "development",
      regionCode: "",
      status: "PUBLISHED",
      version: "1",
      tabNavigationJson: "[]",
      metadataJson: "{\"description\":\"Dynamic mobile home\"}",
    });
  }

  function resetComponentForm() {
    setEditingComponentId("");
    setComponentForm({
      componentKey: "home_hero_banner",
      componentType: "BANNER",
      displayName: "Home Hero Banner",
      schemaVersion: "1",
      dataSourceKey: "",
      status: "PUBLISHED",
      propsJson: "{\"eyebrow\":\"Tonight\",\"title\":\"Dynamic home banner\",\"subtitle\":\"Delivered from the API\",\"ctaLabel\":\"Open trending\",\"ctaRoute\":\"/home/trending-live\"}",
    });
  }

  function openCreateLayoutModal() {
    resetLayoutForm();
    setShowLayoutModal(true);
  }

  function openEditLayoutModal(layout: Record<string, unknown>) {
    setEditingLayoutId(String(layout.id ?? ""));
    setLayoutForm({
      layoutKey: String(layout.layoutKey ?? ""),
      layoutName: String(layout.layoutName ?? ""),
      screenKey: String(layout.screenKey ?? ""),
      platform: String(layout.platform ?? "MOBILE"),
      environment: String(layout.environment ?? "development"),
      regionCode: layout.regionCode ? String(layout.regionCode) : "",
      status: String(layout.status ?? "PUBLISHED"),
      version: String(layout.version ?? 1),
      tabNavigationJson: JSON.stringify(layout.tabNavigationJson ?? [], null, 2),
      metadataJson: JSON.stringify(layout.metadataJson ?? {}, null, 2),
    });
    setShowLayoutModal(true);
  }

  function openCreateComponentModal() {
    resetComponentForm();
    setShowComponentModal(true);
  }

  function openEditComponentModal(component: Record<string, unknown>) {
    setEditingComponentId(String(component.id ?? ""));
    setComponentForm({
      componentKey: String(component.componentKey ?? ""),
      componentType: String(component.componentType ?? "BANNER"),
      displayName: String(component.displayName ?? ""),
      schemaVersion: String(component.schemaVersion ?? 1),
      dataSourceKey: component.dataSourceKey ? String(component.dataSourceKey) : "",
      status: String(component.status ?? "PUBLISHED"),
      propsJson: JSON.stringify(component.propsJson ?? {}, null, 2),
    });
    setShowComponentModal(true);
  }

  function openPositionsEditor(layoutId = selectedLayoutId) {
    const nextLayoutId = String(layoutId ?? "");
    const currentPositions = nextLayoutId === selectedLayoutId ? positions : [];
    setPositionsForm({
      layoutId: nextLayoutId,
      positionsJson: JSON.stringify(
        currentPositions.map((position, index) => ({
          componentId: String(position.componentId),
          sectionKey: String(position.sectionKey),
          slotKey: position.slotKey ? String(position.slotKey) : null,
          breakpoint: String(position.breakpoint ?? "default"),
          positionIndex: Number(position.positionIndex ?? index),
          visibilityRulesJson: position.visibilityRulesJson ?? {},
          overridesJson: position.overridesJson ?? {},
        })),
        null,
        2,
      ),
    });
    setShowPositionsModal(true);
  }

  useEffect(() => {
    if (!selectedLayoutId && layouts.length > 0) {
      setSelectedLayoutId(String(layouts[0]?.id ?? ""));
    }
  }, [layouts, selectedLayoutId]);

  const layoutOptions = useMemo(
    () => layouts.map((layout) => ({ id: String(layout.id), label: `${String(layout.layoutKey)} (${String(layout.layoutName)})` })),
    [layouts],
  );

  const selectedLayout = useMemo(
    () => layouts.find((layout) => String(layout.id) === selectedLayoutId) ?? null,
    [layouts, selectedLayoutId],
  );

  const selectedPositions = useMemo(
    () => positions.sort((left, right) => Number(left.positionIndex ?? 0) - Number(right.positionIndex ?? 0)),
    [positions],
  );

  const componentById = useMemo(
    () => new Map(components.map((component) => [String(component.id), component])),
    [components],
  );

  function reorderSelectedPositions(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = selectedPositions.findIndex((position) => String(position.id) === sourceId);
    const targetIndex = selectedPositions.findIndex((position) => String(position.id) === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...selectedPositions];
    const [moved] = next.splice(sourceIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);

    setPositionsForm((current) => ({
      ...current,
      layoutId: selectedLayoutId,
      positionsJson: JSON.stringify(
        next.map((position, index) => ({
          componentId: String(position.componentId),
          sectionKey: String(position.sectionKey),
          slotKey: position.slotKey ? String(position.slotKey) : null,
          breakpoint: String(position.breakpoint ?? "default"),
          positionIndex: index,
          visibilityRulesJson: position.visibilityRulesJson ?? {},
          overridesJson: position.overridesJson ?? {},
        })),
        null,
        2,
      ),
    }));
  }

  function saveSelectedOrder() {
    if (!selectedLayoutId) return;
    const parsed = positionsForm.layoutId === selectedLayoutId
      ? JSON.parse(positionsForm.positionsJson)
      : selectedPositions.map((position, index) => ({
          componentId: String(position.componentId),
          sectionKey: String(position.sectionKey),
          slotKey: position.slotKey ? String(position.slotKey) : null,
          breakpoint: String(position.breakpoint ?? "default"),
          positionIndex: index,
          visibilityRulesJson: position.visibilityRulesJson ?? {},
          overridesJson: position.overridesJson ?? {},
        }));

    replacePositions.mutate({ layoutId: selectedLayoutId, positions: parsed });
  }

  function renderPreview(component: Record<string, unknown> | undefined) {
    if (!component) return <p className="text-xs text-muted-foreground">Missing component</p>;

    const props = (component.propsJson ?? {}) as Record<string, unknown>;
    switch (String(component.componentType)) {
      case "BANNER":
        return (
          <div className="rounded-xl border bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">{String(props.eyebrow ?? "Banner")}</p>
            <p className="mt-2 text-lg font-semibold">{String(props.title ?? component.displayName)}</p>
            <p className="mt-2 text-sm text-slate-300">{String(props.subtitle ?? "")}</p>
          </div>
        );
      case "CARD_LIST":
        return <p className="text-sm text-muted-foreground">Card list with {Array.isArray(props.cards) ? props.cards.length : 0} cards</p>;
      case "TABS":
        return <p className="text-sm text-muted-foreground">Tabs: {Array.isArray(props.tabs) ? props.tabs.map((tab) => String((tab as Record<string, unknown>).label ?? "Tab")).join(", ") : "none"}</p>;
      case "FLOATING_ACTION":
        return <p className="text-sm text-muted-foreground">Floating action: {String(props.label ?? component.displayName)}</p>;
      default:
        return <p className="text-sm text-muted-foreground">{String(component.componentType)} component preview</p>;
    }
  }

  return (
    <>
      <PageHeader
        title="Dynamic UI Layouts"
        description="Configure ui_layouts, ui_components, and component_positions for mobile dynamic rendering."
        actions={
          <>
            <Button variant="secondary" onClick={() => openPositionsEditor()} disabled={!selectedLayoutId}>Set Positions</Button>
            <Button variant="secondary" onClick={openCreateComponentModal}>Add Component</Button>
            <Button onClick={openCreateLayoutModal}>Add Layout</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Layouts" value={layouts.length} icon={LayoutTemplate} />
        <KpiCard label="Components" value={components.length} icon={PanelTop} />
        <KpiCard label="Positions" value={positions.length} icon={PanelsTopLeft} />
        <KpiCard label="Published" value={layouts.filter((row) => String(row.status) === "PUBLISHED").length} icon={AppWindow} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="ui_layouts">
          <DataTable
            columns={[
              { key: "layoutKey", label: "Key" },
              { key: "screenKey", label: "Screen" },
              { key: "platform", label: "Platform" },
              { key: "version", label: "Version" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "DRAFT")} /> },
              { key: "actions", label: "", render: (row) => <Button variant="ghost" size="sm" onClick={() => openEditLayoutModal(row)}>Edit</Button> },
            ]}
            data={layouts}
            onRowClick={(row) => setSelectedLayoutId(String(row.id ?? ""))}
          />
        </Card>

        <Card title="ui_components">
          <DataTable
            columns={[
              { key: "componentKey", label: "Key" },
              { key: "componentType", label: "Type" },
              { key: "displayName", label: "Display Name" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "DRAFT")} /> },
              { key: "actions", label: "", render: (row) => <Button variant="ghost" size="sm" onClick={() => openEditComponentModal(row)}>Edit</Button> },
            ]}
            data={components}
          />
        </Card>

        <Card
          title="component_positions"
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openPositionsEditor()} disabled={!selectedLayoutId}>Raw JSON</Button>
              <Button onClick={saveSelectedOrder} disabled={!selectedLayoutId || replacePositions.isPending}>Save Order</Button>
            </div>
          }
        >
          <div className="mb-4 text-sm text-muted-foreground">
            Editing: {selectedLayout ? `${String(selectedLayout.layoutName)} (${String(selectedLayout.layoutKey)})` : "Select a layout"}
          </div>
          <div className="space-y-3">
            {selectedPositions.map((position) => {
              const component = componentById.get(String(position.componentId));
              return (
                <div
                  key={String(position.id)}
                  draggable
                  onDragStart={() => setDraggedPositionId(String(position.id))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => reorderSelectedPositions(draggedPositionId, String(position.id))}
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{String(component?.displayName ?? position.componentId)}</p>
                      <p className="text-xs text-muted-foreground">{String(position.sectionKey)} / {String(position.slotKey ?? "default")} / index {String(position.positionIndex ?? 0)}</p>
                    </div>
                    <StatusBadge status={String(component?.componentType ?? "DRAFT")} />
                  </div>
                  <div className="mt-3">{renderPreview(component)}</div>
                </div>
              );
            })}
            {selectedPositions.length === 0 ? <p className="text-sm text-muted-foreground">No positions published for this layout.</p> : null}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Layout Preview">
          {selectedPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Choose a layout with published positions to preview it.</p>
          ) : (
            <div className="space-y-4">
              {selectedPositions.map((position) => {
                const component = componentById.get(String(position.componentId));
                return (
                  <div key={`preview-${String(position.id)}`} className="rounded-xl border border-dashed p-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{String(position.sectionKey)}</div>
                    {renderPreview(component)}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showLayoutModal} onClose={() => { setShowLayoutModal(false); resetLayoutForm(); }} title={editingLayoutId ? "Edit Layout" : "Create or Publish Layout"}>
        <div className="space-y-4">
          <Input label="Layout Key" value={layoutForm.layoutKey} onChange={(event) => setLayoutForm((current) => ({ ...current, layoutKey: event.target.value }))} />
          <Input label="Layout Name" value={layoutForm.layoutName} onChange={(event) => setLayoutForm((current) => ({ ...current, layoutName: event.target.value }))} />
          <Input label="Screen Key" value={layoutForm.screenKey} onChange={(event) => setLayoutForm((current) => ({ ...current, screenKey: event.target.value }))} />
          <Input label="Platform" value={layoutForm.platform} onChange={(event) => setLayoutForm((current) => ({ ...current, platform: event.target.value }))} />
          <Input label="Environment" value={layoutForm.environment} onChange={(event) => setLayoutForm((current) => ({ ...current, environment: event.target.value }))} />
          <Input label="Region Code" value={layoutForm.regionCode} onChange={(event) => setLayoutForm((current) => ({ ...current, regionCode: event.target.value }))} />
          <Input label="Version" type="number" value={layoutForm.version} onChange={(event) => setLayoutForm((current) => ({ ...current, version: event.target.value }))} />
          <Input label="Status" value={layoutForm.status} onChange={(event) => setLayoutForm((current) => ({ ...current, status: event.target.value }))} />
          <div>
            <label className="block text-sm font-medium mb-1">Tab Navigation JSON</label>
            <textarea className="w-full min-h-28 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={layoutForm.tabNavigationJson} onChange={(event) => setLayoutForm((current) => ({ ...current, tabNavigationJson: event.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Metadata JSON</label>
            <textarea className="w-full min-h-28 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={layoutForm.metadataJson} onChange={(event) => setLayoutForm((current) => ({ ...current, metadataJson: event.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={upsertLayout.isPending}
              onClick={() => upsertLayout.mutate({
                id: editingLayoutId || undefined,
                layoutKey: layoutForm.layoutKey,
                layoutName: layoutForm.layoutName,
                screenKey: layoutForm.screenKey,
                platform: layoutForm.platform as "MOBILE" | "WEB" | "ALL",
                environment: layoutForm.environment,
                regionCode: layoutForm.regionCode || null,
                status: layoutForm.status as "DRAFT" | "PUBLISHED" | "ROLLED_BACK",
                version: Number(layoutForm.version),
                tabNavigationJson: JSON.parse(layoutForm.tabNavigationJson),
                metadataJson: JSON.parse(layoutForm.metadataJson),
              })}
            >
              Save Layout
            </Button>
            <Button variant="secondary" onClick={() => { setShowLayoutModal(false); resetLayoutForm(); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showComponentModal} onClose={() => { setShowComponentModal(false); resetComponentForm(); }} title={editingComponentId ? "Edit Component" : "Create or Publish Component"}>
        <div className="space-y-4">
          <Input label="Component Key" value={componentForm.componentKey} onChange={(event) => setComponentForm((current) => ({ ...current, componentKey: event.target.value }))} />
          <Input label="Component Type" value={componentForm.componentType} onChange={(event) => setComponentForm((current) => ({ ...current, componentType: event.target.value }))} />
          <Input label="Display Name" value={componentForm.displayName} onChange={(event) => setComponentForm((current) => ({ ...current, displayName: event.target.value }))} />
          <Input label="Schema Version" type="number" value={componentForm.schemaVersion} onChange={(event) => setComponentForm((current) => ({ ...current, schemaVersion: event.target.value }))} />
          <Input label="Data Source Key" value={componentForm.dataSourceKey} onChange={(event) => setComponentForm((current) => ({ ...current, dataSourceKey: event.target.value }))} />
          <Input label="Status" value={componentForm.status} onChange={(event) => setComponentForm((current) => ({ ...current, status: event.target.value }))} />
          <div>
            <label className="block text-sm font-medium mb-1">Props JSON</label>
            <textarea className="w-full min-h-40 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={componentForm.propsJson} onChange={(event) => setComponentForm((current) => ({ ...current, propsJson: event.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={upsertComponent.isPending}
              onClick={() => upsertComponent.mutate({
                id: editingComponentId || undefined,
                componentKey: componentForm.componentKey,
                componentType: componentForm.componentType as any,
                displayName: componentForm.displayName,
                schemaVersion: Number(componentForm.schemaVersion),
                dataSourceKey: componentForm.dataSourceKey || null,
                status: componentForm.status as any,
                propsJson: JSON.parse(componentForm.propsJson),
              })}
            >
              Save Component
            </Button>
            <Button variant="secondary" onClick={() => { setShowComponentModal(false); resetComponentForm(); }}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showPositionsModal} onClose={() => setShowPositionsModal(false)} title="Replace Component Positions">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Layout</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={positionsForm.layoutId} onChange={(event) => setPositionsForm((current) => ({ ...current, layoutId: event.target.value }))}>
              <option value="">Select a layout</option>
              {layoutOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Positions JSON</label>
            <textarea className="w-full min-h-48 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={positionsForm.positionsJson} onChange={(event) => setPositionsForm((current) => ({ ...current, positionsJson: event.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={replacePositions.isPending || !positionsForm.layoutId}
              onClick={() => replacePositions.mutate({ layoutId: positionsForm.layoutId, positions: JSON.parse(positionsForm.positionsJson) })}
            >
              Save Positions
            </Button>
            <Button variant="secondary" onClick={() => setShowPositionsModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}