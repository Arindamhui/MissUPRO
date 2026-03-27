"use client";
import Image from "next/image";
import { useI18n } from "@/i18n";

const iosDownloadHref = process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL || "/discover";
const androidDownloadHref = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || "/discover";

const featureCards = [
  { icon: "Video", titleKey: "public.featureCards.callsTitle", descKey: "public.featureCards.callsDesc" },
  { icon: "Live", titleKey: "public.featureCards.liveTitle", descKey: "public.featureCards.liveDesc" },
  { icon: "Party", titleKey: "public.featureCards.partyTitle", descKey: "public.featureCards.partyDesc" },
  { icon: "Audio", titleKey: "public.featureCards.audioTitle", descKey: "public.featureCards.audioDesc" },
  { icon: "Gifts", titleKey: "public.featureCards.giftsTitle", descKey: "public.featureCards.giftsDesc" },
  { icon: "Games", titleKey: "public.featureCards.gamesTitle", descKey: "public.featureCards.gamesDesc" },
];

const creatorStats = [
  { stat: "70%", labelKey: "public.creatorStats.revenueLabel", descKey: "public.creatorStats.revenueDesc" },
  { stat: "24h", labelKey: "public.creatorStats.payoutLabel", descKey: "public.creatorStats.payoutDesc" },
  { stat: "10+", labelKey: "public.creatorStats.streamsLabel", descKey: "public.creatorStats.streamsDesc" },
];

const topModels = [
  { name: "Aisha", country: "IN", specialty: "Live • Chat • PK" },
  { name: "Mina", country: "AE", specialty: "Party • Gifts • Music" },
  { name: "Sofia", country: "US", specialty: "Calls • Games • VIP" },
  { name: "Lina", country: "BD", specialty: "Live • Squad • Events" },
  { name: "Noor", country: "PK", specialty: "Audio • Community" },
  { name: "Riya", country: "IN", specialty: "Shorts • Moments" },
];

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <>
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <Image src="/brand/missu-pro-web-logo.png" alt="MissU Pro" width={420} height={138} className="h-auto w-full max-w-[360px] md:max-w-[420px]" priority />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            {t("public.hero.title").split(", ").map((part, index) => (
              <span key={part} className={index === 2 ? "text-primary" : undefined}>
                {index > 0 ? ", " : ""}
                {part}
              </span>
            ))}
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            {t("public.hero.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" id="download">
            <a
              href={iosDownloadHref}
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold hover:bg-gray-800 transition"
            >
              {t("public.hero.ios")}
            </a>
            <a
              href={androidDownloadHref}
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold hover:opacity-90 transition"
            >
              {t("public.hero.android")}
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="introduction">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">A modern social streaming platform</h2>
              <p className="text-lg text-gray-600 mt-4 max-w-xl">
                MissU Pro combines live streaming, 1:1 calls, gifting, chat, PK battles, levels, and agency tools
                into one scalable platform for millions of users.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-white p-5">
                  <div className="font-semibold text-gray-900">Real-time everything</div>
                  <div className="text-sm text-gray-600 mt-1">Chat, gifts, reactions, PK updates, and call status via Socket.io.</div>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <div className="font-semibold text-gray-900">Wallet economy</div>
                  <div className="text-sm text-gray-600 mt-1">Coins, diamonds, gifts, commissions, payouts, and admin pricing control.</div>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <div className="font-semibold text-gray-900">Streaming & calls</div>
                  <div className="text-sm text-gray-600 mt-1">Live + audio/video calls powered by Agora with secure token issuance.</div>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                  <div className="font-semibold text-gray-900">Agency operations</div>
                  <div className="text-sm text-gray-600 mt-1">Roster management, earnings tracking, analytics, and withdrawals.</div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border bg-gradient-to-b from-white to-gray-50 p-8">
              <div className="text-sm text-gray-600">What you get</div>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                  <span className="text-gray-700"><span className="font-semibold">Users</span> browse, call, gift, follow, chat, recharge</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                  <span className="text-gray-700"><span className="font-semibold">Models</span> go live, receive calls & gifts, view earnings & ranking</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                  <span className="text-gray-700"><span className="font-semibold">Agencies</span> manage models, payouts, analytics, settings</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                  <span className="text-gray-700"><span className="font-semibold">Admins</span> control pricing, commissions, features, approvals, content</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 px-4" id="features">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t("public.sections.everything")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCards.map((card) => (
              <div key={card.titleKey} className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="text-2xl font-semibold mb-4 text-primary">{card.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(card.titleKey)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(card.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="top-models">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Top models</h2>
              <p className="text-gray-600 mt-2">A glimpse of what’s trending on MissU Pro.</p>
            </div>
            <a href="/discover" className="text-sm font-medium text-primary hover:underline">
              Explore streams →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topModels.map((m) => (
              <div key={m.name} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {m.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.country}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">{m.specialty}</div>
                <div className="mt-5 flex gap-2">
                  <a href="/login" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
                    Follow
                  </a>
                  <a href="/discover" className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">
                    Watch live
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="creators">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("public.sections.creatorsTitle")}</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            {t("public.sections.creatorsBody")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creatorStats.map((stat) => (
              <div key={stat.labelKey} className="bg-gray-50 rounded-2xl p-8">
                <div className="text-4xl font-bold text-primary mb-2">{stat.stat}</div>
                <div className="font-semibold text-gray-900 mb-1">{t(stat.labelKey)}</div>
                <div className="text-sm text-gray-600">{t(stat.descKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 px-4" id="join-agency">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border bg-white p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Join as an agency</h2>
              <p className="text-gray-600 mt-3 max-w-2xl">
                Build your roster, track earnings, and manage payouts. MissU Pro agencies get a dedicated dashboard
                with analytics and full admin-controlled commission rules.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/agency-signup"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
              >
                Create agency account
              </a>
              <a
                href="/agency-login"
                className="inline-flex items-center justify-center px-6 py-3 border rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
              >
                Agency login
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900">Transparent pricing and creator economics</h2>
            <p className="mt-4 text-lg text-gray-600">
              MissU Pro combines per-minute calling, gifting, creator payouts, and agency commissions into one live
              economy. Fans get clear pricing, and creators keep track of earnings in real time.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">For viewers</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Recharge coins, join streams, send gifts, and pay only for the sessions you actually use.</p>
            </div>
            <div id="creator-guidelines" className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Creator guidelines</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Go live, take calls, follow platform rules, and build your audience with predictable moderation and approvals.</p>
            </div>
            <div id="earnings" className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Earnings visibility</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Track gifts, calls, commissions, and payout activity from your web and agency dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 px-4" id="about">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">About MissU Pro</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">Built for live entertainment, MissU Pro connects fans, creators, agencies, and operations teams in one platform.</p>
          </div>
          <div id="blog" className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Product updates</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">Explore the latest platform highlights through featured streams, creator tools, and agency workflow improvements.</p>
          </div>
          <div id="careers" className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Careers and partnerships</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">Work with creators, agencies, and internal operators to scale moderation, growth, and monetization across the platform.</p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4" id="terms">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Terms of service</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Platform access, payment usage, and account responsibilities are governed through operational and content policies.</p>
            </div>
            <div id="privacy" className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Privacy policy</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Authentication, profile data, earnings records, and moderation logs are handled with role-aware access controls.</p>
            </div>
            <div id="community" className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Community guidelines</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">Live sessions, creator conduct, and agency operations follow moderation and approval standards across the platform.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("public.sections.ctaTitle")}</h2>
          <p className="text-lg opacity-90 mb-8">
            {t("public.sections.ctaBody")}
          </p>
          <a
            href="/discover"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-xl text-lg font-semibold hover:bg-gray-100 transition"
          >
            {t("public.sections.ctaButton")}
          </a>
        </div>
      </section>
    </>
  );
}
