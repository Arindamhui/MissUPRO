import Link from "next/link";

const features = [
  "Shared AG IDs for agency-based host onboarding",
  "Host approvals controlled by central admin review",
  "Roster visibility across web admin, agency web, and mobile app",
  "Clerk authentication with role-aware panel routing",
];

const steps = [
  { title: "Sign up", body: "Register your agency with Google, Facebook, phone OTP, or WhatsApp OTP." },
  { title: "Wait for approval", body: "Admin verifies your business profile and activates your MissU agency workspace." },
  { title: "Share your AG ID", body: "Approved hosts can join your roster directly from the MissU mobile app using your agency code." },
  { title: "Operate at scale", body: "Review hosts, monitor approvals, and manage your growing roster from the agency panel." },
];

export default function AgenciesLandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(27,180,255,0.18),_transparent_32%),linear-gradient(180deg,_#f7fbff_0%,_#eef4ff_45%,_#ffffff_100%)] text-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-cyan-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
              MissU Pro Agency Network
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">
              Build a host roster with clear IDs, clean approvals, and a real operating panel.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              MissU Pro agencies get a dedicated onboarding and roster workflow: approved agency codes, host validation,
              admin-controlled activation, and a consistent data model shared across mobile and web.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Start agency registration
              </Link>
              <Link href="/agency/missu-pro" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Open agency panel
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">What agencies get</div>
            <div className="mt-6 space-y-4">
              {features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-10 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Operating flow</div>
          <h2 className="mt-4 text-3xl font-semibold">From registration to approved roster</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-cyan-700">0{index + 1}</div>
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}