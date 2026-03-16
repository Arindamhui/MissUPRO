import { useClerk } from "@clerk/clerk-expo";
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { Screen, Card, Button } from "@/components/ui";
import { supportedLocales, useI18n } from "@/i18n";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { trpc } from "@/lib/trpc";

type SettingRow = { label: string; type: "toggle" | "link" | "action"; value?: boolean; onPress?: () => void; onToggle?: (v: boolean) => void; danger?: boolean };

export default function SettingsScreen() {
  const { t, locale, setLocale, isRTL } = useI18n();
  const { signOut } = useClerk();
  const compliance = trpc.compliance;
  const deletionRequest = compliance.getMyDeletionRequest.useQuery(undefined, { retry: false });
  const dataExports = compliance.listMyDataExports.useQuery(undefined, { retry: false });
  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

  const requestDeletion = compliance.requestAccountDeletion.useMutation({
    onSuccess: () => {
      deletionRequest.refetch();
      Alert.alert("Deletion requested", "Your account has entered the cooling-off period.");
    },
    onError: (error: unknown) => Alert.alert("Request failed", getErrorMessage(error)),
  });
  const requestDataExport = compliance.requestDataExport.useMutation({
    onSuccess: () => {
      dataExports.refetch();
      Alert.alert("Export requested", "We started preparing your data export.");
    },
    onError: (error: unknown) => Alert.alert("Request failed", getErrorMessage(error)),
  });
  const [pushNotifications, setPushNotifications] = useState(true);
  const [callNotifications, setCallNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowStrangerDM, setAllowStrangerDM] = useState(false);
  const [autoPlayVideo, setAutoPlayVideo] = useState(true);
  const latestDataExport = dataExports.data?.[0];
  const currentDeletionRequest = deletionRequest.data;

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: "Account",
      rows: [
        { label: "Edit Profile", type: "link", onPress: () => {} },
        { label: "Change Password", type: "link", onPress: () => {} },
        { label: "Linked Accounts", type: "link", onPress: () => {} },
        { label: "Blocked Users", type: "link", onPress: () => {} },
      ],
    },
    {
      title: "Notifications",
      rows: [
        { label: "Push Notifications", type: "toggle", value: pushNotifications, onToggle: setPushNotifications },
        { label: "Call Notifications", type: "toggle", value: callNotifications, onToggle: setCallNotifications },
        { label: "Message Notifications", type: "toggle", value: messageNotifications, onToggle: setMessageNotifications },
      ],
    },
    {
      title: "Privacy",
      rows: [
        { label: "Show Online Status", type: "toggle", value: showOnlineStatus, onToggle: setShowOnlineStatus },
        { label: "Allow DMs from Strangers", type: "toggle", value: allowStrangerDM, onToggle: setAllowStrangerDM },
        {
          label: `Request Data Export${latestDataExport ? ` (${latestDataExport.status})` : ""}`,
          type: "action",
          onPress: () => requestDataExport.mutate(),
        },
        {
          label: `Deletion Status${currentDeletionRequest ? ` (${currentDeletionRequest.status})` : ""}`,
          type: "action",
          onPress: () => Alert.alert(
            "Deletion status",
            currentDeletionRequest
              ? `Current status: ${currentDeletionRequest.status}`
              : "No account deletion request found.",
          ),
        },
      ],
    },
    {
      title: "Media",
      rows: [
        { label: "Auto-play Videos", type: "toggle", value: autoPlayVideo, onToggle: setAutoPlayVideo },
        { label: "Clear Cache", type: "action", onPress: () => Alert.alert("Cache Cleared", "Local cache has been cleared.") },
      ],
    },
    {
      title: "About",
      rows: [
        { label: "Terms of Service", type: "link", onPress: () => {} },
        { label: "Privacy Policy", type: "link", onPress: () => {} },
        { label: "Version", type: "link" },
      ],
    },
    {
      title: "Danger Zone",
      rows: [
        { label: "Sign Out", type: "action", danger: true, onPress: () => { void signOut().then(() => router.replace("/(auth)/login")); } },
        {
          label: "Delete Account", type: "action", danger: true,
          onPress: () => Alert.alert("Delete Account", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => requestDeletion.mutate({ reason: "Requested from mobile settings" }) },
          ]),
        },
      ],
    },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.lg, textAlign: isRTL ? "right" : "left" }}>
          {t("settings.title")}
        </Text>

        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {t("settings.languageSection")}
          </Text>
          <Card style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: SPACING.sm }}>
            {supportedLocales.map((option) => (
              <Button
                key={option.code}
                title={
                  option.code === "en"
                    ? t("common.english")
                    : option.code === "ar"
                      ? t("common.arabic")
                      : t("common.hindi")
                }
                onPress={() => setLocale(option.code)}
                variant={locale === option.code ? "primary" : "secondary"}
                style={{ flex: 1 }}
              />
            ))}
          </Card>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: SPACING.lg }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {section.title}
            </Text>
            <Card>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  onPress={row.type === "toggle" ? undefined : row.onPress}
                  activeOpacity={row.type === "toggle" ? 1 : 0.7}
                  style={{
                    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                    paddingVertical: 14, paddingHorizontal: 16,
                    borderBottomWidth: i < section.rows.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.border,
                  }}
                >
                  <Text style={{ fontSize: 15, color: row.danger ? COLORS.danger : COLORS.text, fontWeight: row.danger ? "600" : "400" }}>
                    {row.label}
                  </Text>

                  {row.type === "toggle" && (
                    <Switch
                      value={row.value}
                      onValueChange={row.onToggle}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor={row.value ? COLORS.primary : COLORS.textSecondary}
                    />
                  )}

                  {row.type === "link" && row.label === "Version" && (
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>1.0.0</Text>
                  )}

                  {row.type === "link" && row.label !== "Version" && (
                    <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>›</Text>
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
