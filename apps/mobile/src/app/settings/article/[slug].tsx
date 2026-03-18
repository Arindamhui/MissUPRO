import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Button, Card } from "@/components/ui";
import { getSettingsExternalUrl, openExternalUrl } from "@/lib/external-links";
import { COLORS, SPACING } from "@/theme";

const articles: Record<string, { title: string; body: string; cta?: string }> = {
  "terms-of-service": {
    title: "Terms of Service",
    body: "Your account, wallet, live access, and creator tools are governed by the service terms configured for the platform. Use the external policy link when you need the full legal text.",
    cta: "Open Terms",
  },
  "privacy-policy": {
    title: "Privacy Policy",
    body: "Privacy controls in the app affect inbox permissions, alerts, and visibility. The full privacy policy explains data handling, retention, and user rights.",
    cta: "Open Privacy Policy",
  },
  faq: {
    title: "FAQ",
    body: "Use this area for support topics such as account access, balances, VIP, gifts, and live-room issues. If an external FAQ is configured, you can open it below.",
    cta: "Open FAQ",
  },
  about: {
    title: "About",
    body: "MissU Pro combines live entertainment, messaging, VIP subscriptions, room themes, and creator tools in one mobile experience. This screen is kept in-app so users always have a stable fallback even when external pages are not configured.",
    cta: "Open Website",
  },
  facebook: {
    title: "Facebook",
    body: "Open the official community page to follow announcements, campaigns, and new feature releases.",
    cta: "Open Facebook",
  },
  support: {
    title: "Help & Support",
    body: "For login, payment, moderation, or creator support issues, use the configured support channel. If no external support URL is present, the app still shows this fallback page instead of a dead link.",
    cta: "Contact Support",
  },
  connect: {
    title: "Connect With Us",
    body: "Use the official support or social contact configured for the mobile environment to reach the team directly.",
    cta: "Open Contact Channel",
  },
  eula: {
    title: "EULA",
    body: "The end-user license agreement covers usage rights, account restrictions, and software limitations for the mobile application.",
    cta: "Open EULA",
  },
  "child-safety": {
    title: "Child Safety",
    body: "Safety controls, moderation tools, and reporting policies are managed centrally. This page acts as an in-app safety reference and can also deep-link to the platform policy if configured.",
    cta: "Open Safety Policy",
  },
  "refund-policy": {
    title: "Refund Policy",
    body: "Wallet purchases, VIP upgrades, and creator economy flows are subject to the platform refund policy. Open the external policy page if it is configured for this environment.",
    cta: "Open Refund Policy",
  },
  review: {
    title: "Review Us!",
    body: "This entry takes users to the app store review page when the store URL is configured. It remains accessible as an in-app screen so navigation never breaks.",
    cta: "Open Store Page",
  },
  "check-update": {
    title: "Check for update",
    body: "Current version: 1.0.0. Use the store listing configured for this environment to look for available updates.",
    cta: "Open Store Listing",
  },
};

export default function SettingsArticleScreen() {
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const article = articles[String(slug)] ?? { title: "Information", body: "This page is not configured yet." };
  const url = getSettingsExternalUrl(String(slug));

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={8} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: SPACING.md, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={24} />
        </TouchableOpacity>
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>{article.title}</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: "rgba(255,255,255,0.78)", lineHeight: 24, fontSize: 16 }}>{article.body}</Text>
          {article.cta ? <Button title={article.cta} onPress={() => void openExternalUrl(url, article.title)} style={{ marginTop: 18 }} /> : null}
        </Card>
      </ScrollView>
    </View>
  );
}