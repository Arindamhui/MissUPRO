import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Card } from "@/components/ui";
import { supportedLocales, useI18n } from "@/i18n";
import { COLORS, SPACING } from "@/theme";

export default function LanguageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useI18n();

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
        <Text style={{ color: COLORS.white, fontSize: 34, fontWeight: "900", marginBottom: 16 }}>Language</Text>
        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          {supportedLocales.map((option, index) => {
            const label = option.code === "en" ? t("common.english") : option.code === "ar" ? t("common.arabic") : t("common.hindi");
            const active = locale === option.code;
            return (
              <TouchableOpacity key={option.code} onPress={() => setLocale(option.code)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: index < supportedLocales.length - 1 ? 1 : 0, borderBottomColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: active ? "700" : "500" }}>{label}</Text>
                <MaterialCommunityIcons color={active ? "#FF4C4C" : "rgba(255,255,255,0.26)"} name={active ? "check-circle" : "checkbox-blank-circle-outline"} size={22} />
              </TouchableOpacity>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}