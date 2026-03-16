"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type LocaleCode = "en" | "ar" | "hi";

type DictionaryValue = string | Record<string, DictionaryValue>;

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const SUPPORTED_LOCALES: Array<{ code: LocaleCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

const messages: Record<LocaleCode, DictionaryValue> = {
  en: {
    common: {
      language: "Language",
      english: "English",
      arabic: "Arabic",
      hindi: "Hindi",
      cancel: "Cancel",
      success: "Success",
      error: "Error",
      na: "N/A",
    },
    navigation: {
      partyRoom: "Party Room",
      audioRoom: "Audio Room",
      profile: "Profile",
      chat: "Chat",
      wallet: "Wallet",
      gifts: "Gifts",
      notifications: "Notifications",
      creatorDashboard: "Creator Dashboard",
      events: "Events",
      games: "Games",
      vip: "VIP",
      settings: "Settings",
      referrals: "Referrals",
      leaderboards: "Leaderboards",
    },
    system: {
      clerkMissingTitle: "Clerk mobile config missing",
      clerkMissingBody: "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in apps/mobile/.env and restart Metro.",
      clerkMissingHint: "The app stays mounted so Expo Router can load normally instead of crashing during startup.",
      shareFailed: "Unable to open the share sheet right now.",
      requestFailed: "Request failed",
    },
    events: {
      fallbackTitle: "Event",
      starts: "Starts: {date}",
      ends: "Ends: {date}",
      join: "Join Event",
      emptyTitle: "No Events",
      emptySubtitle: "Check back later for exciting events and competitions!",
    },
    referrals: {
      inviteCodeTitle: "Your Invite Code",
      shareInvite: "Share Invite",
      generateInviteCode: "Generate Invite Code",
      statsTitle: "Referral Stats",
      invited: "Invited",
      qualified: "Qualified",
      rewarded: "Rewarded",
      rewardsEarned: "Rewards Earned",
      noRewardsTitle: "No Rewards Yet",
      noRewardsSubtitle: "Invite friends to earn rewards!",
      shareMessage: "Join me on MissUPRO! Use my invite code: {code}\n\nDownload now and get bonus coins!",
      status: "Status: {status}",
      generateFailed: "Unable to generate an invite code.",
    },
    vip: {
      activatedTitle: "Success",
      activatedBody: "VIP subscription activated!",
      cancelledTitle: "Cancelled",
      cancelledBody: "Your VIP subscription has been cancelled.",
      activateFailed: "Unable to activate VIP right now.",
      cancelFailed: "Unable to cancel VIP right now.",
      subscribePromptTitle: "Subscribe to VIP",
      subscribePromptBody: "Activate {tier} VIP?",
      cancelPromptTitle: "Cancel VIP",
      cancelPromptBody: "Are you sure you want to cancel your VIP subscription?",
      keepVip: "Keep VIP",
      cancelVip: "Cancel VIP",
      currentStatus: "VIP {tier}",
      expires: "Expires: {date}",
      cancelSubscription: "Cancel Subscription",
      upgradeTitle: "Upgrade to VIP",
      upgradeSubtitle: "Unlock exclusive perks and stand out",
      noTiers: "VIP tiers are configured from backend settings. No active tier is available right now.",
      currentPlan: "Current Plan",
      subscribe: "Subscribe",
      durationFallback: "30 days",
    },
    settings: {
      title: "Settings",
      languageSection: "Language",
    },
  },
  ar: {
    common: {
      language: "اللغة",
      english: "الإنجليزية",
      arabic: "العربية",
      hindi: "الهندية",
      cancel: "إلغاء",
      success: "نجاح",
      error: "خطأ",
      na: "غير متاح",
    },
    navigation: {
      partyRoom: "غرفة الحفلة",
      audioRoom: "الغرفة الصوتية",
      profile: "الملف الشخصي",
      chat: "الدردشة",
      wallet: "المحفظة",
      gifts: "الهدايا",
      notifications: "الإشعارات",
      creatorDashboard: "لوحة المنشئ",
      events: "الفعاليات",
      games: "الألعاب",
      vip: "كبار الشخصيات",
      settings: "الإعدادات",
      referrals: "الإحالات",
      leaderboards: "لوحات الصدارة",
    },
    system: {
      clerkMissingTitle: "إعداد Clerk للموبايل مفقود",
      clerkMissingBody: "قم بتعيين EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY في apps/mobile/.env ثم أعد تشغيل Metro.",
      clerkMissingHint: "يبقى التطبيق محملاً حتى يعمل Expo Router بشكل طبيعي دون تعطل عند البداية.",
      shareFailed: "تعذر فتح نافذة المشاركة الآن.",
      requestFailed: "فشل الطلب",
    },
    events: {
      fallbackTitle: "فعالية",
      starts: "يبدأ: {date}",
      ends: "ينتهي: {date}",
      join: "انضم إلى الفعالية",
      emptyTitle: "لا توجد فعاليات",
      emptySubtitle: "عد لاحقًا لاكتشاف فعاليات ومسابقات جديدة.",
    },
    referrals: {
      inviteCodeTitle: "رمز الدعوة الخاص بك",
      shareInvite: "مشاركة الدعوة",
      generateInviteCode: "إنشاء رمز دعوة",
      statsTitle: "إحصاءات الإحالة",
      invited: "تمت دعوتهم",
      qualified: "مؤهلون",
      rewarded: "تمت مكافأتهم",
      rewardsEarned: "المكافآت المكتسبة",
      noRewardsTitle: "لا توجد مكافآت بعد",
      noRewardsSubtitle: "ادعُ أصدقاءك لكسب المكافآت!",
      shareMessage: "انضم إليّ في MissUPRO! استخدم رمز الدعوة الخاص بي: {code}\n\nحمّل التطبيق الآن واحصل على عملات إضافية!",
      status: "الحالة: {status}",
      generateFailed: "تعذر إنشاء رمز الدعوة.",
    },
    vip: {
      activatedTitle: "تم بنجاح",
      activatedBody: "تم تفعيل اشتراك VIP!",
      cancelledTitle: "تم الإلغاء",
      cancelledBody: "تم إلغاء اشتراك VIP الخاص بك.",
      activateFailed: "تعذر تفعيل VIP الآن.",
      cancelFailed: "تعذر إلغاء VIP الآن.",
      subscribePromptTitle: "الاشتراك في VIP",
      subscribePromptBody: "هل تريد تفعيل VIP {tier}؟",
      cancelPromptTitle: "إلغاء VIP",
      cancelPromptBody: "هل أنت متأكد أنك تريد إلغاء اشتراك VIP؟",
      keepVip: "الاحتفاظ بـ VIP",
      cancelVip: "إلغاء VIP",
      currentStatus: "VIP {tier}",
      expires: "ينتهي في: {date}",
      cancelSubscription: "إلغاء الاشتراك",
      upgradeTitle: "الترقية إلى VIP",
      upgradeSubtitle: "افتح المزايا الحصرية وتميز عن الآخرين",
      noTiers: "يتم إعداد مستويات VIP من الخادم. لا يوجد مستوى نشط الآن.",
      currentPlan: "الخطة الحالية",
      subscribe: "اشترك",
      durationFallback: "30 يومًا",
    },
    settings: {
      title: "الإعدادات",
      languageSection: "اللغة",
    },
  },
  hi: {
    common: {
      language: "भाषा",
      english: "अंग्रेज़ी",
      arabic: "अरबी",
      hindi: "हिन्दी",
      cancel: "रद्द करें",
      success: "सफल",
      error: "त्रुटि",
      na: "उपलब्ध नहीं",
    },
    navigation: {
      partyRoom: "पार्टी रूम",
      audioRoom: "ऑडियो रूम",
      profile: "प्रोफ़ाइल",
      chat: "चैट",
      wallet: "वॉलेट",
      gifts: "गिफ्ट्स",
      notifications: "नोटिफिकेशन",
      creatorDashboard: "क्रिएटर डैशबोर्ड",
      events: "इवेंट्स",
      games: "गेम्स",
      vip: "वीआईपी",
      settings: "सेटिंग्स",
      referrals: "रेफ़रल्स",
      leaderboards: "लीडरबोर्ड्स",
    },
    system: {
      clerkMissingTitle: "Clerk मोबाइल कॉन्फ़िगरेशन उपलब्ध नहीं है",
      clerkMissingBody: "apps/mobile/.env में EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY सेट करें और Metro दोबारा शुरू करें।",
      clerkMissingHint: "ऐप माउंटेड रहता है ताकि Expo Router स्टार्टअप पर क्रैश किए बिना लोड हो सके।",
      shareFailed: "अभी शेयर शीट खोलना संभव नहीं है।",
      requestFailed: "अनुरोध विफल हुआ",
    },
    events: {
      fallbackTitle: "इवेंट",
      starts: "शुरू: {date}",
      ends: "समाप्त: {date}",
      join: "इवेंट जॉइन करें",
      emptyTitle: "कोई इवेंट नहीं",
      emptySubtitle: "रोमांचक इवेंट्स और प्रतियोगिताओं के लिए बाद में फिर देखें।",
    },
    referrals: {
      inviteCodeTitle: "आपका आमंत्रण कोड",
      shareInvite: "आमंत्रण साझा करें",
      generateInviteCode: "आमंत्रण कोड बनाएं",
      statsTitle: "रेफ़रल आँकड़े",
      invited: "आमंत्रित",
      qualified: "योग्य",
      rewarded: "पुरस्कृत",
      rewardsEarned: "कमाए गए रिवॉर्ड्स",
      noRewardsTitle: "अभी तक कोई रिवॉर्ड नहीं",
      noRewardsSubtitle: "रिवॉर्ड पाने के लिए दोस्तों को आमंत्रित करें!",
      shareMessage: "MissUPRO पर मेरे साथ जुड़ें! मेरा आमंत्रण कोड इस्तेमाल करें: {code}\n\nअभी डाउनलोड करें और बोनस कॉइन्स पाएं!",
      status: "स्थिति: {status}",
      generateFailed: "आमंत्रण कोड बनाना संभव नहीं हुआ।",
    },
    vip: {
      activatedTitle: "सफल",
      activatedBody: "वीआईपी सदस्यता सक्रिय हो गई है!",
      cancelledTitle: "रद्द किया गया",
      cancelledBody: "आपकी वीआईपी सदस्यता रद्द कर दी गई है।",
      activateFailed: "अभी वीआईपी सक्रिय करना संभव नहीं है।",
      cancelFailed: "अभी वीआईपी रद्द करना संभव नहीं है।",
      subscribePromptTitle: "VIP सब्सक्राइब करें",
      subscribePromptBody: "{tier} VIP सक्रिय करें?",
      cancelPromptTitle: "VIP रद्द करें",
      cancelPromptBody: "क्या आप अपनी VIP सदस्यता रद्द करना चाहते हैं?",
      keepVip: "VIP बनाए रखें",
      cancelVip: "VIP रद्द करें",
      currentStatus: "VIP {tier}",
      expires: "समाप्ति: {date}",
      cancelSubscription: "सदस्यता रद्द करें",
      upgradeTitle: "VIP में अपग्रेड करें",
      upgradeSubtitle: "विशेष लाभ अनलॉक करें और अलग दिखें",
      noTiers: "VIP टियर बैकएंड सेटिंग्स से कॉन्फ़िगर होते हैं। अभी कोई सक्रिय टियर उपलब्ध नहीं है।",
      currentPlan: "वर्तमान प्लान",
      subscribe: "सब्सक्राइब करें",
      durationFallback: "30 दिन",
    },
    settings: {
      title: "सेटिंग्स",
      languageSection: "भाषा",
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

function getValueFromDictionary(locale: LocaleCode, key: string): string | undefined {
  const segments = key.split(".");
  let current: DictionaryValue | undefined = messages[locale];

  for (const segment of segments) {
    if (!current || typeof current === "string") {
      return undefined;
    }
    current = current[segment];
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<LocaleCode>(() => {
    try {
      return normalizeLocale(Intl.DateTimeFormat().resolvedOptions().locale);
    } catch {
      return "en";
    }
  });

  const value = useMemo<I18nContextValue>(() => {
    const isRTL = locale === "ar";
    return {
      locale,
      setLocale,
      dir: isRTL ? "rtl" : "ltr",
      isRTL,
      t: (key, vars) => {
        const resolved = getValueFromDictionary(locale, key)
          ?? getValueFromDictionary("en", key)
          ?? key;
        return interpolate(resolved, vars);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export const supportedLocales = SUPPORTED_LOCALES;
