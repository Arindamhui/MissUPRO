import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const role = resolvedSearchParams.role;
  const reason = typeof resolvedSearchParams.reason === "string" ? resolvedSearchParams.reason : null;
  const redirectTo = typeof resolvedSearchParams.redirect === "string" ? resolvedSearchParams.redirect : null;

  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  if (redirectTo) params.set("redirect", redirectTo);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  if (role === "admin") {
    redirect(`/admin-login${suffix}`);
  }

  // Default to agency login for agency role or unspecified
  redirect(`/agency-login${suffix}`);
}

