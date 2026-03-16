"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type LocaleCode = "en" | "ar" | "hi";
type DictionaryValue = string | Record<string, unknown>;

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export const supportedLocales: Array<{ code: LocaleCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

const messages: Record<LocaleCode, DictionaryValue> = {
  en: {
    common: {
      language: "Language",
    },
    public: {
      nav: {
        features: "Features",
        creators: "For Creators",
        download: "Download",
        adminLogin: "Admin Login",
      },
      hero: {
        title: "Connect, Create, Earn",
        body: "MissUPRO is the live streaming creator economy platform where creators connect with fans through video calls, live streams, parties, and more.",
        ios: "Download for iOS",
        android: "Download for Android",
      },
      sections: {
        everything: "Everything You Need",
        creatorsTitle: "Built for Creators",
        creatorsBody: "Monetize your talent with multiple revenue streams. Set your own rates, track earnings in real-time, and withdraw anytime.",
        ctaTitle: "Ready to Get Started?",
        ctaBody: "Join thousands of creators and fans on MissUPRO today.",
        ctaButton: "Download Now",
      },
      featureCards: {
        callsTitle: "1-on-1 Video Calls",
        callsDesc: "Private video and audio calls with your favorite creators. Per-minute billing with transparent pricing.",
        liveTitle: "Live Streaming",
        liveDesc: "Go live and broadcast to thousands. Receive gifts, host PK battles, and grow your audience.",
        partyTitle: "Party Rooms",
        partyDesc: "Multi-seat interactive rooms with games, karaoke, and group activities for up to 9 participants.",
        audioTitle: "Group Audio",
        audioDesc: "Clubhouse-style audio rooms with hand-raise, speaker management, and timed billing.",
        giftsTitle: "Virtual Gifts",
        giftsDesc: "Send and receive animated gifts with real monetary value. Creators earn diamonds convertible to cash.",
        gamesTitle: "In-Call Games",
        gamesDesc: "Play chess, ludo, carrom, and sudoku during calls. Make every interaction fun and engaging.",
      },
      creatorStats: {
        revenueLabel: "Revenue Share",
        revenueDesc: "Industry-leading creator payouts",
        payoutLabel: "Fast Payouts",
        payoutDesc: "Withdraw earnings within 24 hours",
        streamsLabel: "Revenue Streams",
        streamsDesc: "Calls, gifts, streams, VIP, and more",
      },
      footer: {
        product: "Product",
        creators: "Creators",
        company: "Company",
        legal: "Legal",
        download: "Download",
        pricing: "Pricing",
        becomeCreator: "Become a Creator",
        creatorGuidelines: "Creator Guidelines",
        earnings: "Earnings",
        about: "About",
        blog: "Blog",
        careers: "Careers",
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        community: "Community Guidelines",
        rights: "All rights reserved.",
      },
    },
  },
  ar: {
    common: {
      language: "اللغة",
    },
    public: {
      nav: {
        features: "المزايا",
        creators: "لصناع المحتوى",
        download: "التنزيل",
        adminLogin: "دخول الإدارة",
      },
      hero: {
        title: "تواصل، أنشئ، واربح",
        body: "MissUPRO هي منصة اقتصاد المبدعين للبث المباشر حيث يتواصل صناع المحتوى مع المعجبين عبر المكالمات والبث المباشر والحفلات والمزيد.",
        ios: "حمّل على iOS",
        android: "حمّل على Android",
      },
      sections: {
        everything: "كل ما تحتاجه",
        creatorsTitle: "مصممة لصناع المحتوى",
        creatorsBody: "حوّل موهبتك إلى دخل من خلال مصادر ربح متعددة. حدّد أسعارك وتابع أرباحك لحظيًا واسحبها في أي وقت.",
        ctaTitle: "هل أنت مستعد للبدء؟",
        ctaBody: "انضم إلى آلاف المبدعين والمعجبين على MissUPRO اليوم.",
        ctaButton: "حمّل الآن",
      },
      featureCards: {
        callsTitle: "مكالمات فيديو فردية",
        callsDesc: "مكالمات فيديو وصوت خاصة مع صناعك المفضلين مع تسعير واضح لكل دقيقة.",
        liveTitle: "البث المباشر",
        liveDesc: "ابدأ البث أمام الآلاف وتلقّ الهدايا واستضف معارك PK ووسّع جمهورك.",
        partyTitle: "غرف الحفلات",
        partyDesc: "غرف تفاعلية متعددة المقاعد مع ألعاب وكاريوكي وأنشطة جماعية لما يصل إلى 9 مشاركين.",
        audioTitle: "الغرف الصوتية الجماعية",
        audioDesc: "غرف صوتية على نمط Clubhouse مع رفع اليد وإدارة المتحدثين وتسعير زمني.",
        giftsTitle: "الهدايا الافتراضية",
        giftsDesc: "أرسل واستقبل هدايا متحركة ذات قيمة حقيقية، ويكسب المبدعون ألماسًا قابلاً للتحويل إلى نقد.",
        gamesTitle: "ألعاب أثناء المكالمة",
        gamesDesc: "العب الشطرنج واللودو والكارم والسودوكو أثناء المكالمات لجعل كل تفاعل أكثر متعة.",
      },
      creatorStats: {
        revenueLabel: "حصة الأرباح",
        revenueDesc: "عوائد متميزة لصناع المحتوى",
        payoutLabel: "سحوبات سريعة",
        payoutDesc: "اسحب أرباحك خلال 24 ساعة",
        streamsLabel: "مصادر دخل",
        streamsDesc: "مكالمات وهدايا وبث مباشر وVIP والمزيد",
      },
      footer: {
        product: "المنتج",
        creators: "المبدعون",
        company: "الشركة",
        legal: "قانوني",
        download: "التنزيل",
        pricing: "الأسعار",
        becomeCreator: "كن صانع محتوى",
        creatorGuidelines: "إرشادات المبدعين",
        earnings: "الأرباح",
        about: "حول",
        blog: "المدونة",
        careers: "الوظائف",
        terms: "شروط الخدمة",
        privacy: "سياسة الخصوصية",
        community: "إرشادات المجتمع",
        rights: "جميع الحقوق محفوظة.",
      },
    },
  },
  hi: {
    common: {
      language: "भाषा",
    },
    public: {
      nav: {
        features: "फ़ीचर्स",
        creators: "क्रिएटर्स के लिए",
        download: "डाउनलोड",
        adminLogin: "एडमिन लॉगिन",
      },
      hero: {
        title: "जुड़ें, बनाएं, कमाएं",
        body: "MissUPRO एक लाइव-स्ट्रीमिंग क्रिएटर इकॉनमी प्लेटफ़ॉर्म है जहाँ क्रिएटर्स वीडियो कॉल, लाइव स्ट्रीम, पार्टी और बहुत कुछ के ज़रिए फैन्स से जुड़ते हैं।",
        ios: "iOS के लिए डाउनलोड करें",
        android: "Android के लिए डाउनलोड करें",
      },
      sections: {
        everything: "आपको जो चाहिए, सब कुछ",
        creatorsTitle: "क्रिएटर्स के लिए बनाया गया",
        creatorsBody: "कई रेवेन्यू स्ट्रीम्स के साथ अपनी प्रतिभा को कमाई में बदलें। अपनी दरें तय करें, कमाई रियल-टाइम में ट्रैक करें और कभी भी निकालें।",
        ctaTitle: "शुरू करने के लिए तैयार हैं?",
        ctaBody: "आज ही MissUPRO पर हज़ारों क्रिएटर्स और फैन्स से जुड़ें।",
        ctaButton: "अभी डाउनलोड करें",
      },
      featureCards: {
        callsTitle: "1-ऑन-1 वीडियो कॉल्स",
        callsDesc: "अपने पसंदीदा क्रिएटर्स के साथ निजी वीडियो और ऑडियो कॉल्स। पारदर्शी प्रति-मिनट बिलिंग।",
        liveTitle: "लाइव स्ट्रीमिंग",
        liveDesc: "हज़ारों लोगों तक लाइव जाएँ। गिफ्ट पाएं, PK बैटल होस्ट करें और अपना ऑडियंस बढ़ाएं।",
        partyTitle: "पार्टी रूम्स",
        partyDesc: "गेम्स, कराओके और समूह गतिविधियों वाले मल्टी-सीट इंटरैक्टिव रूम्स, 9 प्रतिभागियों तक।",
        audioTitle: "ग्रुप ऑडियो",
        audioDesc: "Clubhouse-स्टाइल ऑडियो रूम्स जिनमें हैंड-रेज़, स्पीकर मैनेजमेंट और टाइम्ड बिलिंग हो।",
        giftsTitle: "वर्चुअल गिफ्ट्स",
        giftsDesc: "एनिमेटेड गिफ्ट भेजें और पाएं जिनकी वास्तविक मूल्य हो। क्रिएटर्स डायमंड कमाते हैं जिन्हें कैश में बदला जा सकता है।",
        gamesTitle: "इन-कॉल गेम्स",
        gamesDesc: "कॉल्स के दौरान शतरंज, लूडो, कैरम और सुडोकू खेलें। हर इंटरैक्शन को मज़ेदार बनाएं।",
      },
      creatorStats: {
        revenueLabel: "रेवेन्यू शेयर",
        revenueDesc: "उद्योग में अग्रणी क्रिएटर पेआउट्स",
        payoutLabel: "तेज़ पेआउट्स",
        payoutDesc: "24 घंटे के भीतर कमाई निकालें",
        streamsLabel: "रेवेन्यू स्ट्रीम्स",
        streamsDesc: "कॉल्स, गिफ्ट्स, स्ट्रीम्स, VIP और बहुत कुछ",
      },
      footer: {
        product: "प्रोडक्ट",
        creators: "क्रिएटर्स",
        company: "कंपनी",
        legal: "कानूनी",
        download: "डाउनलोड",
        pricing: "प्राइसिंग",
        becomeCreator: "क्रिएटर बनें",
        creatorGuidelines: "क्रिएटर गाइडलाइन्स",
        earnings: "कमाई",
        about: "हमारे बारे में",
        blog: "ब्लॉग",
        careers: "करियर",
        terms: "सेवा की शर्तें",
        privacy: "गोपनीयता नीति",
        community: "कम्युनिटी गाइडलाइन्स",
        rights: "सभी अधिकार सुरक्षित हैं।",
      },
    },
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

function normalizeLocale(rawLocale: string | null | undefined): LocaleCode {
  const base = (rawLocale ?? "en").split("-")[0]?.toLowerCase();
  if (base === "ar") return "ar";
  if (base === "hi") return "hi";
  return "en";
}

function getValue(locale: LocaleCode, key: string): string | undefined {
  const segments = key.split(".");
  let current: DictionaryValue | undefined = messages[locale];

  for (const segment of segments) {
    if (!current || typeof current === "string") {
      return undefined;
    }
    current = (current as Record<string, DictionaryValue | undefined>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function WebI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("missu.locale") : null;
    const nextLocale = normalizeLocale(stored ?? (typeof navigator !== "undefined" ? navigator.language : "en"));
    setLocale(nextLocale);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("missu.locale", locale);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const isRTL = locale === "ar";
    return {
      locale,
      setLocale,
      dir: isRTL ? "rtl" : "ltr",
      isRTL,
      t: (key, vars) => {
        const resolved = getValue(locale, key) ?? getValue("en", key) ?? key;
        return interpolate(resolved, vars);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within WebI18nProvider");
  }
  return context;
}
