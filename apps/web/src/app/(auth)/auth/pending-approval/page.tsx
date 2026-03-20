import PendingApprovalPageClient from "./page-client";

export default function PendingApprovalPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <PendingApprovalPageClient clerkEnabled={clerkEnabled} />;
}
