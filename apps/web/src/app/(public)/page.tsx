"use client";
import Image from "next/image";
import { useI18n } from "@/i18n";

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
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold hover:bg-gray-800 transition"
            >
              {t("public.hero.ios")}
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold hover:opacity-90 transition"
            >
              {t("public.hero.android")}
            </a>
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

      <section className="py-20 bg-primary px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("public.sections.ctaTitle")}</h2>
          <p className="text-lg opacity-90 mb-8">
            {t("public.sections.ctaBody")}
          </p>
          <a
            href="#download"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-xl text-lg font-semibold hover:bg-gray-100 transition"
          >
            {t("public.sections.ctaButton")}
          </a>
        </div>
      </section>
    </>
  );
}
