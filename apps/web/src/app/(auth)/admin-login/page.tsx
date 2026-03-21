import AdminLoginClient from "./page-client";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reason = typeof resolvedSearchParams.reason === "string" ? resolvedSearchParams.reason : null;
  const redirectTo = typeof resolvedSearchParams.redirect === "string" ? resolvedSearchParams.redirect : null;

  return <AdminLoginClient reason={reason} redirectTo={redirectTo} />;
}

