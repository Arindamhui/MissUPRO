import React, { useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { Button, Card, Input, Screen } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

type HostMode = "PLATFORM" | "AGENCY";

export default function HostCenterScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<HostMode>("PLATFORM");
  const [agencyCode, setAgencyCode] = useState("");
  const [idProofFront, setIdProofFront] = useState("");
  const [idProofBack, setIdProofBack] = useState("");
  const [talentCategories, setTalentCategories] = useState("");
  const [talentDescription, setTalentDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [languages, setLanguages] = useState("");
  const [error, setError] = useState<string | null>(null);

  const workspace = trpc.missu.getMyWorkspace.useQuery(undefined, { retry: false });
  const agencyLookup = trpc.missu.lookupAgencyByCode.useQuery(
    { agencyCode },
    { retry: false, enabled: mode === "AGENCY" && agencyCode.trim().length >= 4 },
  );
  const submitApplication = trpc.missu.submitHostApplication.useMutation({
    onSuccess: () => {
      setError(null);
      void workspace.refetch();
    },
    onError: (mutationError: unknown) => setError(String((mutationError as { message?: string })?.message ?? mutationError)),
  });

  const host = workspace.data?.host;
  const latestApplication = workspace.data?.latestHostApplication;
  const currentStatus = String(host?.status ?? latestApplication?.status ?? "NOT_STARTED");
  const agencyLookupState = useMemo(() => {
    if (mode !== "AGENCY") return null;
    if (!agencyCode.trim()) return "Enter an AG code to validate it.";
    if (agencyLookup.isLoading) return "Validating agency ID...";
    if (!agencyLookup.data?.found) return "Agency ID not found.";
    if (agencyLookup.data.status !== "APPROVED") return "Agency exists but is still pending admin approval.";
    return `Agency matched: ${agencyLookup.data.agency?.agencyName} (${agencyLookup.data.agency?.agencyCode})`;
  }, [agencyCode, agencyLookup.data, agencyLookup.isLoading, mode]);

  const handleSubmit = () => {
    if (!idProofFront.trim()) {
      setError("At least one ID proof URL is required.");
      return;
    }
    if (!talentDescription.trim()) {
      setError("Talent description is required.");
      return;
    }
    if (mode === "AGENCY" && !agencyCode.trim()) {
      setError("Agency ID is required for agency-based host onboarding.");
      return;
    }

    submitApplication.mutate({
      mode,
      agencyCode: mode === "AGENCY" ? agencyCode.trim().toUpperCase() : undefined,
      idProofUrls: [idProofFront.trim(), idProofBack.trim()].filter(Boolean),
      talentDetails: {
        categories: talentCategories.split(",").map((item) => item.trim()).filter(Boolean),
        description: talentDescription.trim(),
      },
      profileInfo: {
        tagline: tagline.trim(),
        about: about.trim(),
        languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={10} />

      <Screen scroll style={{ backgroundColor: "transparent" }}>
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 120 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <View>
              <Text style={{ color: "#9FD6FF", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }}>MISSU HOST CENTER</Text>
              <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "900", marginTop: 6 }}>Become a Host</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/me" as never)}>
              <MaterialCommunityIcons color={COLORS.white} name="account-circle-outline" size={34} />
            </TouchableOpacity>
          </View>

          <Card style={{ backgroundColor: "rgba(7,14,39,0.58)", borderWidth: 1, borderColor: "rgba(106,201,255,0.24)" }}>
            <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>Your MissU ID</Text>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginTop: 6 }}>{String(workspace.data?.user?.publicUserId ?? "Loading...")}</Text>
            <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>Status: {currentStatus}</Text>
              </View>
              {host?.hostId ? (
                <View style={{ borderRadius: 999, backgroundColor: "rgba(79,227,255,0.12)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: "#92EFFF", fontSize: 12, fontWeight: "700" }}>Host ID: {String(host.hostId)}</Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 0, borderRadius: 28 }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: "800", marginBottom: 12 }}>Choose your path</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
              {[
                { value: "PLATFORM", label: "Platform Host" },
                { value: "AGENCY", label: "Agency Host" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setMode(item.value as HostMode)}
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    backgroundColor: mode === item.value ? "rgba(79,227,255,0.2)" : "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: mode === item.value ? "rgba(79,227,255,0.6)" : "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: "800" }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "AGENCY" ? (
              <>
                <Input label="Agency ID" placeholder="AG56584585" value={agencyCode} onChangeText={setAgencyCode} autoCapitalize="characters" />
                <Text style={{ color: agencyLookup.data?.status === "APPROVED" ? "#92EFFF" : "rgba(255,255,255,0.68)", fontSize: 12, marginTop: -6, marginBottom: 14 }}>
                  {agencyLookupState}
                </Text>
              </>
            ) : null}

            <Input label="ID Proof URL" placeholder="https://.../government-id-front.jpg" value={idProofFront} onChangeText={setIdProofFront} autoCapitalize="none" />
            <Input label="Optional second proof" placeholder="https://.../government-id-back.jpg" value={idProofBack} onChangeText={setIdProofBack} autoCapitalize="none" />
            <Input label="Talent categories" placeholder="singing, live talk, gaming" value={talentCategories} onChangeText={setTalentCategories} />
            <Input label="Talent details" placeholder="Describe your talent and hosting style" value={talentDescription} onChangeText={setTalentDescription} multiline />
            <Input label="Tagline" placeholder="Late-night entertainer" value={tagline} onChangeText={setTagline} />
            <Input label="About profile" placeholder="Tell the review team about your profile" value={about} onChangeText={setAbout} multiline />
            <Input label="Languages" placeholder="English, Hindi" value={languages} onChangeText={setLanguages} />

            {error ? <Text style={{ color: "#FF8E8E", marginBottom: 12 }}>{error}</Text> : null}
            {latestApplication?.reviewNotes ? <Text style={{ color: "#FFD27A", marginBottom: 12 }}>Review note: {String(latestApplication.reviewNotes)}</Text> : null}

            <Button
              title={submitApplication.isPending ? "Submitting..." : mode === "AGENCY" ? "Apply with Agency ID" : "Apply as Platform Host"}
              onPress={handleSubmit}
              loading={submitApplication.isPending}
              disabled={currentStatus === "APPROVED" || currentStatus === "PENDING"}
              style={{ marginTop: 4 }}
            />
          </Card>

          <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 0, borderRadius: 28 }}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Approval rules</Text>
            {[
              "Every new user receives a custom MissU User ID in the format U#########.",
              "Platform hosts receive H######### after admin approval.",
              "Agency hosts receive AH######## after admin approval and agency validation.",
              "Approved agencies can share their AG######## ID for direct host linking.",
            ].map((item) => (
              <Text key={item} style={{ color: "rgba(255,255,255,0.78)", lineHeight: 22, marginBottom: 8 }}>{`• ${item}`}</Text>
            ))}
          </Card>
        </View>
      </Screen>
    </View>
  );
}