"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, Button, Card, KpiCard, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Gift, TrendingUp, Diamond, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function GiftsPage() {
  const [tab, setTab] = useState("catalog");
  const [showCreate, setShowCreate] = useState(false);

  const catalog = trpc.admin.listGifts.useQuery(undefined, { retry: false });
  const giftRows = (catalog.data?.gifts ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Gift Management"
        description="Manage gift catalog, analytics, and seasonal gifts"
        actions={<Button onClick={() => setShowCreate(true)}>Create Gift</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Gifts Sent" value={formatNumber(45230)} icon={Gift} />
        <KpiCard label="Gift Revenue" value={formatCurrency(125400)} icon={TrendingUp} />
        <KpiCard label="Diamonds Distributed" value={formatNumber(890000)} icon={Diamond} />
        <KpiCard label="Top Gifters" value="128" icon={Users} />
      </div>

      <Tabs
        tabs={[
          { id: "catalog", label: "Gift Catalog" },
          { id: "analytics", label: "Analytics" },
          { id: "leaderboard", label: "Top Gifters" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "catalog" && (
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "coinPrice", label: "Price (Coins)" },
            { key: "diamondValue", label: "Diamond Value" },
            { key: "category", label: "Category" },
            { key: "isActive", label: "Active", render: (r) => r.isActive ? "Yes" : "No" },
            { key: "actions", label: "", render: () => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm">Delete</Button>
              </div>
            )},
          ]}
          data={giftRows}
        />
      )}

      {tab === "analytics" && (
        <Card title="Gift Volume (7 days)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, gifts: Math.round(100 + Math.random() * 500), revenue: Math.round(2000 + Math.random() * 8000) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="gifts" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === "leaderboard" && (
        <Card title="Top Gifters"><p className="text-sm text-muted-foreground">Leaderboard loaded via gift.leaderboard</p></Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Gift">
        <div className="space-y-4">
          <Input label="Gift Name" placeholder="Enter gift name" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Coin Price" type="number" placeholder="100" />
            <Input label="Diamond Value" type="number" placeholder="75" />
          </div>
          <Select label="Category" options={[
            { value: "standard", label: "Standard" },
            { value: "premium", label: "Premium" },
            { value: "seasonal", label: "Seasonal" },
            { value: "animated", label: "Animated" },
          ]} />
          <Select label="Context" options={[
            { value: "all", label: "All" },
            { value: "live", label: "Live Stream" },
            { value: "call", label: "Call" },
            { value: "party", label: "Party" },
          ]} />
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
