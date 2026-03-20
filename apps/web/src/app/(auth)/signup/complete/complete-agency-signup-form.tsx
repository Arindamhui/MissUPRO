"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { buildAuthErrorHref } from "@/lib/auth-paths";
import { completeAgencySignupRequest } from "@/lib/auth-api";

type FormState = {
  agencyName: string;
  contactName: string;
  contactEmail: string;
  country: string;
};

export function CompleteAgencySignupForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    agencyName: "",
    contactName: user?.fullName ?? "",
    contactEmail: user?.primaryEmailAddress?.emailAddress ?? "",
    country: "",
  }));

  const isValid = useMemo(() => (
    form.agencyName.trim().length >= 2 &&
    form.contactName.trim().length >= 2 &&
    form.contactEmail.trim().length >= 3 &&
    form.country.trim().length >= 2
  ), [form]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fullName = user.fullName ?? "";
    const email = user.primaryEmailAddress?.emailAddress ?? "";

    setForm((current) => ({
      ...current,
      contactName: current.contactName.trim().length > 0 ? current.contactName : fullName,
      contactEmail: current.contactEmail.trim().length > 0 ? current.contactEmail : email,
    }));
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const token = await getToken();
      if (!token) {
        router.replace("/signup");
        return;
      }

      const session = await completeAgencySignupRequest(token, form);
      if (session.status === "agency") {
        router.replace("/agency/dashboard");
        return;
      }

      if (session.status === "agency_pending_approval") {
        router.replace("/auth/pending-approval");
        return;
      }

      router.replace(buildAuthErrorHref(session.reason ?? "unauthorized_role", "agency"));
    } catch {
      setError("We could not create the agency profile. Check the form and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          Agency name
          <input
            value={form.agencyName}
            onChange={(event) => setForm((current) => ({ ...current, agencyName: event.target.value }))}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="North Star Agency"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Contact name
          <input
            value={form.contactName}
            onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="Aisha Rahman"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Contact email
          <input
            type="email"
            value={form.contactEmail}
            onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="ops@northstar.agency"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Country
          <input
            value={form.country}
            onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            className="h-12 rounded-2xl border border-slate-200 px-4 text-slate-950 outline-none transition focus:border-[#ff6b3d] focus:ring-2 focus:ring-[#ff6b3d]/20"
            placeholder="United Arab Emirates"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={!isValid || pending}>
        {pending ? "Creating agency profile..." : "Finish signup"}
      </Button>
    </form>
  );
}