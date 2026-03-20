import SignupPageClient from "./page-client";

export default function SignupPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <SignupPageClient clerkEnabled={clerkEnabled} />;
}

