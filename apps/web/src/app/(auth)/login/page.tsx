import LoginPageClient from "./page-client";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const role = resolvedSearchParams.role === "admin" ? "admin" : "agency";
  const reason = typeof resolvedSearchParams.reason === "string" ? resolvedSearchParams.reason : null;
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return <LoginPageClient role={role} reason={reason} clerkEnabled={clerkEnabled} />;
}

