import { requirePortalRole } from "@/lib/auth-server";
import { AgencySidebar } from "@/components/agency-sidebar";

export const dynamic = "force-dynamic";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole("agency");

  return (
    <div className="flex min-h-screen">
      <AgencySidebar />
      <main className="flex-1 bg-gray-50/50">
        <div className="px-6 py-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}

