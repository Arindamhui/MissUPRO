"use client";

import { type LucideIcon, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "slate" | "amber" | "emerald" | "sky";
}) {
  const toneClass = {
    slate: "from-slate-950 via-slate-900 to-slate-800 text-white",
    amber: "from-amber-500 via-orange-500 to-orange-600 text-white",
    emerald: "from-emerald-500 via-emerald-600 to-teal-700 text-white",
    sky: "from-sky-500 via-blue-600 to-indigo-700 text-white",
  }[tone];

  return (
    <div className={cn("overflow-hidden rounded-[28px] bg-gradient-to-br p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.5)]", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">{label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-2 text-sm text-white/75">{hint}</p> : null}
        </div>
        <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminPanelCard({ title, subtitle, actions, children, className }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; }) {
  return (
    <section className={cn("rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-35px_rgba(15,23,42,0.35)]", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function AdminButton({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; }) {
  const style = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];

  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50", style, className)} {...props} />;
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" {...props} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" {...props} />;
}

export function AdminSearchField({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string; }) {
  return (
    <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
      <Search className="h-4 w-4 text-slate-400" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-full w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
      {value ? <button onClick={() => onChange("")} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button> : null}
    </div>
  );
}

export function AdminStatusPill({ value }: { value: string | boolean | null | undefined }) {
  const normalized = String(value ?? "unknown").toUpperCase();
  const tones: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    PENDING_VERIFICATION: "bg-amber-100 text-amber-700",
    PROCESSING: "bg-sky-100 text-sky-700",
    IN_PROGRESS: "bg-sky-100 text-sky-700",
    REJECTED: "bg-rose-100 text-rose-700",
    BANNED: "bg-rose-100 text-rose-700",
    SUSPENDED: "bg-rose-100 text-rose-700",
    FAILED: "bg-rose-100 text-rose-700",
    REFUNDED: "bg-slate-200 text-slate-700",
    INACTIVE: "bg-slate-100 text-slate-600",
    FALSE: "bg-slate-100 text-slate-600",
    TRUE: "bg-emerald-100 text-emerald-700",
  };

  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide", tones[normalized] ?? "bg-slate-100 text-slate-600")}>{normalized.replaceAll("_", " ")}</span>;
}

export type AdminColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function AdminDataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  rowKey,
  isLoading,
  emptyMessage,
  onRowClick,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const source = [...rows];
    source.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const leftComparable = typeof leftValue === "number" ? leftValue : String(leftValue ?? "");
      const rightComparable = typeof rightValue === "number" ? rightValue : String(rightValue ?? "");
      if (leftComparable < rightComparable) return sortDirection === "asc" ? -1 : 1;
      if (leftComparable > rightComparable) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return source;
  }, [rows, sortDirection, sortKey]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3.5 font-medium text-slate-500", column.className)}>
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 transition hover:text-slate-900"
                      onClick={() => {
                        if (sortKey === column.key) {
                          setSortDirection((current) => current === "asc" ? "desc" : "asc");
                          return;
                        }
                        setSortKey(column.key);
                        setSortDirection("asc");
                      }}
                    >
                      <span>{column.label}</span>
                      {sortKey === column.key ? (sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null}
                    </button>
                  ) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? Array.from({ length: 6 }).map((_, index) => (
              <tr key={`loading-${index}`}>
                {columns.map((column) => <td key={column.key} className="px-4 py-4"><div className="h-4 w-full animate-pulse rounded-full bg-slate-100" /></td>)}
              </tr>
            )) : null}
            {!isLoading && sortedRows.map((row) => (
              <tr key={rowKey(row)} className={cn("transition hover:bg-slate-50/80", onRowClick ? "cursor-pointer" : undefined)} onClick={() => onRowClick?.(row)}>
                {columns.map((column) => <td key={column.key} className={cn("px-4 py-4 align-top text-slate-700", column.className)}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && sortedRows.length === 0 ? <div className="px-6 py-14 text-center text-sm text-slate-500">{emptyMessage ?? "No data available."}</div> : null}
    </div>
  );
}

export function AdminModal({ open, title, description, onClose, children, size = "lg" }: { open: boolean; title: string; description?: string; onClose: () => void; children: React.ReactNode; size?: "md" | "lg" | "xl"; }) {
  if (!open) return null;
  const width = size === "md" ? "max-w-lg" : size === "xl" ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative z-[91] w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-45px_rgba(15,23,42,0.65)]", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function AdminField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string; }) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function AdminPagination({ pageLabel, onPrevious, onNext, disablePrevious, disableNext }: { pageLabel: string; onPrevious: () => void; onNext: () => void; disablePrevious?: boolean; disableNext?: boolean; }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">{pageLabel}</p>
      <div className="flex items-center gap-2">
        <AdminButton variant="secondary" onClick={onPrevious} disabled={disablePrevious}>Previous</AdminButton>
        <AdminButton variant="secondary" onClick={onNext} disabled={disableNext}>Next</AdminButton>
      </div>
    </div>
  );
}

export function AdminTabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-[22px] border border-slate-200 bg-slate-100/80 p-1.5">
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-[18px] px-4 py-2 text-sm font-medium transition",
              active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
