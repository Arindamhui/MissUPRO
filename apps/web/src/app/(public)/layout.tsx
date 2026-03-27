import PublicLayoutClient from "./public-layout-client";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
