import AuthErrorPageClient from "./page-client";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reason = typeof resolvedSearchParams.reason === "string" ? resolvedSearchParams.reason : "unauthorized_role";
  const signedOut = resolvedSearchParams.signed_out === "1";
  const role = resolvedSearchParams.role === "admin" ? "admin" : "agency";
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return <AuthErrorPageClient reason={reason} role={role} signedOut={signedOut} clerkEnabled={clerkEnabled} />;
}