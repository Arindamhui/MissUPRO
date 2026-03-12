import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// ─── KPI Card ───
export function KpiCard({ label, value, icon: Icon, trend, className }: {
  label: string; value: string | number; icon: LucideIcon; trend?: string; className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm", className)}>
      <div className="p-3 rounded-lg bg-primary/10 text-primary"><Icon size={24} /></div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {trend && <p className="text-xs text-success mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

// ─── Page Header ───
export function PageHeader({ title, description, actions }: {
  title: string; description?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

// ─── Data Table ───
export function DataTable<T extends Record<string, unknown>>({ columns, data, onRowClick }: {
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 font-medium text-muted-foreground">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Status Badge ───
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-success/10 text-success",
    approved: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    review: "bg-warning/10 text-warning",
    suspended: "bg-danger/10 text-danger",
    rejected: "bg-danger/10 text-danger",
    blocked: "bg-danger/10 text-danger",
    inactive: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", colors[status.toLowerCase()] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

// ─── Button ───
export function Button({ children, variant = "primary", size = "md", className, ...props }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" | "lg"; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-600",
    secondary: "bg-white border text-foreground hover:bg-muted/50",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "text-muted-foreground hover:bg-muted/50",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-2.5 text-base" };
  return (
    <button className={cn("inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50", variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

// ─── Card ───
export function Card({ children, title, className, actions }: {
  children: React.ReactNode; title?: string; className?: string; actions?: React.ReactNode;
}) {
  return (
    <div className={cn("bg-white rounded-xl border shadow-sm", className)}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Input ───
export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition" {...props} />
    </div>
  );
}

// ─── Select ───
export function Select({ label, options, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white" {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Tabs ───
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ───
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
