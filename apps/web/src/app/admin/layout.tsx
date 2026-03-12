import { Sidebar } from "@/components/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50/50">
        <div className="px-6 py-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
