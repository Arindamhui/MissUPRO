import { requirePortalRole } from "@/lib/auth-server";
import { AdminShell } from "@/features/admin/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole("admin");

  return <AdminShell>{children}</AdminShell>;
}
