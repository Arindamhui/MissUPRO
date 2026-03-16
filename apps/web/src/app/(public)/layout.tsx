"use client";
import { supportedLocales, useI18n } from "@/i18n";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a href="/" className="text-2xl font-bold">
            MissU<span className="text-primary">PRO</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900">{t("public.nav.features")}</a>
            <a href="#creators" className="hover:text-gray-900">{t("public.nav.creators")}</a>
            <a href="#download" className="hover:text-gray-900">{t("public.nav.download")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as "en" | "ar" | "hi")}
              className="rounded-lg border px-3 py-2 text-sm"
              aria-label={t("common.language")}
            >
              {supportedLocales.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
            <a
              href="/admin/dashboard"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("public.nav.adminLogin")}
            </a>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t("public.footer.product")}</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-gray-900">{t("public.nav.features")}</a></li>
              <li><a href="#download" className="hover:text-gray-900">{t("public.footer.download")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.pricing")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t("public.footer.creators")}</h4>
            <ul className="space-y-2">
              <li><a href="#creators" className="hover:text-gray-900">{t("public.footer.becomeCreator")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.creatorGuidelines")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.earnings")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t("public.footer.company")}</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.about")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.blog")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.careers")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{t("public.footer.legal")}</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.terms")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.privacy")}</a></li>
              <li><a href="#" className="hover:text-gray-900">{t("public.footer.community")}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} MissUPRO. {t("public.footer.rights")}
        </div>
      </footer>
    </div>
  );
}
