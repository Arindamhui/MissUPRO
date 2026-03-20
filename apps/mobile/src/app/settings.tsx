import { useClerk } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import { COLORS, SPACING } from "@/theme";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";

const APP_VERSION = "1.0.0";

function SettingsRow({ label, value, highlight, onPress }: { label: string; value?: string; highlight?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
      <Text style={{ color: COLORS.white, fontSize: 19, flex: 1 }}>{label}</Text>
      {highlight ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FF3333", marginRight: 12 }} /> : null}
      {value ? <Text style={{ color: "rgba(255,255,255,0.46)", fontSize: 16, marginRight: 12 }}>{value}</Text> : null}
      <MaterialCommunityIcons color="rgba(255,255,255,0.52)" name="chevron-right" size={24} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { signOut } = useClerk();
  const authMode = useAuthStore((state) => state.authMode);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = authMode === "authenticated";
  const compliance = trpc.compliance;
  const dataExports = compliance.listMyDataExports.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const deleteAccount = compliance.deleteMyAccount.useMutation({
    onSuccess: () => {
      setDeleteModalVisible(false);
      setDeleteReason("");
      clearAuth();
      void signOut().catch(() => undefined);
      Alert.alert("Account deleted", "Your account has been deleted.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    },
    onError: (error: unknown) => Alert.alert("Delete failed", getErrorMessage(error)),
  });

  const requestDataExport = compliance.requestDataExport.useMutation({
    onSuccess: () => {
      dataExports.refetch();
      Alert.alert("Export requested", "We started preparing your data export.");
    },
    onError: (error: unknown) => Alert.alert("Request failed", getErrorMessage(error)),
  });
  const latestDataExport = dataExports.data?.[0];

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={10} />

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 140, paddingTop: insets.top + 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: SPACING.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: "900", color: COLORS.white }}>{t("settings.title")}</Text>
        </View>

        {!isAuthenticated ? (
          <View style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 24, padding: 20 }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}>Sign in required</Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8, lineHeight: 20 }}>Compliance requests and account settings are only available for signed-in users.</Text>
            <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 14 }} />
          </View>
        ) : null}

        {isAuthenticated ? (
          <View style={{ backgroundColor: "rgba(8,13,33,0.86)", borderRadius: 12, overflow: "hidden" }}>
            <SettingsRow label="Linked Accounts" onPress={() => router.push("/settings/linked-accounts")} />
            <SettingsRow label="Privacy" highlight onPress={() => router.push("/settings/privacy")} />
            <SettingsRow label="Effect" onPress={() => router.push("/settings/effects")} />
            <SettingsRow label="Inbox" onPress={() => router.push("/messages/settings")} />
            <SettingsRow label="Language" onPress={() => router.push("/settings/language")} />
            <SettingsRow label="App Alerts" onPress={() => router.push("/settings/app-alerts")} />
            <SettingsRow label="Clear Cache" value="184 M" onPress={() => Alert.alert("Cache cleared", "Local mobile cache has been cleared.")} />
            <SettingsRow label="Review us!" onPress={() => router.push("/settings/article/review")} />
            <SettingsRow label="Facebook" onPress={() => router.push("/settings/article/facebook")} />
            <SettingsRow label="FAQ" onPress={() => router.push("/settings/article/faq")} />
            <SettingsRow label="Check for update" value={`Current version:${APP_VERSION}`} onPress={() => router.push("/settings/article/check-update")} />
            <SettingsRow label="Connect With Us" highlight onPress={() => router.push("/settings/article/connect")} />
            <SettingsRow label="About" onPress={() => router.push("/settings/article/about")} />
            <SettingsRow label="Privacy Policy" onPress={() => router.push("/settings/article/privacy-policy")} />
            <SettingsRow label="EULA" onPress={() => router.push("/settings/article/eula")} />
            <SettingsRow label="Child Safety" onPress={() => router.push("/settings/article/child-safety")} />
            <SettingsRow label="Refund Policy" onPress={() => router.push("/settings/article/refund-policy")} />
          </View>
        ) : null}

        {isAuthenticated ? (
          <View style={{ marginTop: 24, gap: 12 }}>
            <Button title={`Request Data Export${latestDataExport ? ` (${latestDataExport.status})` : ""}`} variant="outline" onPress={() => requestDataExport.mutate()} style={{ borderColor: "rgba(255,255,255,0.24)", backgroundColor: "rgba(255,255,255,0.06)" }} />
            <Button
              title="Delete Account"
              variant="outline"
              onPress={() => setDeleteModalVisible(true)}
              style={{ borderColor: "rgba(255,130,130,0.4)", backgroundColor: "rgba(120,20,20,0.16)" }}
            />
          </View>
        ) : null}

        {/* Delete Account Modal */}
        <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: "#141A42", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "rgba(255,130,130,0.3)" }}>
              <Text style={{ color: "#FF8888", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>Delete Account</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                This will delete your account immediately, sign you out, and prevent future access with this profile. This action cannot be undone.
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 6 }}>Reason (required)</Text>
              <TextInput
                placeholder="Why are you deleting your account?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12, color: COLORS.white, fontSize: 14, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginBottom: 20 }}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity onPress={() => { setDeleteModalVisible(false); setDeleteReason(""); }} style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center" }}>
                  <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (deleteReason.trim().length < 5) {
                      Alert.alert("Reason required", "Please provide at least 5 characters.");
                      return;
                    }
                    deleteAccount.mutate({ reason: deleteReason.trim() });
                  }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#8B2020", alignItems: "center", opacity: deleteReason.trim().length < 5 || deleteAccount.isPending ? 0.5 : 1 }}
                >
                  <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "700" }}>{deleteAccount.isPending ? "Deleting..." : "Delete"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity onPress={() => { void signOut().then(() => router.replace("/(auth)/login")); }} style={{ marginTop: 28, alignItems: "center", paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "500" }}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
