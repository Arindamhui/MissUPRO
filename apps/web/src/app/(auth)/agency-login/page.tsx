import AgencyLoginClient from "./page-client";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AgencyLoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reason = typeof resolvedSearchParams.reason === "string" ? resolvedSearchParams.reason : null;
  const redirectTo = typeof resolvedSearchParams.redirect === "string" ? resolvedSearchParams.redirect : null;

  return <AgencyLoginClient reason={reason} redirectTo={redirectTo} />;
}

