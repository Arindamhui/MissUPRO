import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Screen, Card, SectionHeader, DiamondDisplay, Button, Input, Badge } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { getMobileRuntimeScope } from "@/lib/runtime-config";

type ScheduleSlot = {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  startTime: string;
  endTime: string;
  timezone: string;
};

const DAY_OPTIONS: ScheduleSlot["day"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function CreatorDashboardScreen() {
  const applicationStatus = trpc.model.getMyApplicationStatus.useQuery(undefined, { retry: false });
  const level = trpc.model.getMyLevel.useQuery(undefined, { retry: false });
  const stats = trpc.model.getMyStats.useQuery(undefined, { retry: false });
  const availability = trpc.model.getMyAvailability.useQuery(undefined, { retry: false });
  const demoVideos = trpc.model.getMyDemoVideos.useQuery(undefined, { retry: false });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
  const uploadImage = trpc.media.uploadAvatar.useMutation();
  const submitApplication = trpc.model.submitApplication.useMutation({
    onSuccess: () => {
      applicationStatus.refetch();
      Alert.alert("Application submitted", "Your official talent application is now under review.");
    },
    onError: (error: unknown) => {
      Alert.alert("Unable to apply", error instanceof Error ? error.message : "Please try again.");
    },
  });
  const router = useRouter();

  const updateAvailability = trpc.model.updateAvailability.useMutation({
    onSuccess: () => {
      void availability.refetch();
      Alert.alert("Availability updated", "Your weekly schedule has been saved.");
    },
    onError: (error: unknown) => {
      Alert.alert("Unable to save schedule", error instanceof Error ? error.message : "Please try again.");
    },
  });
  const setOnlineOverride = trpc.model.setOnlineOverride.useMutation({
    onSuccess: () => {
      void availability.refetch();
      void stats.refetch();
    },
    onError: (error: unknown) => {
      Alert.alert("Unable to update status", error instanceof Error ? error.message : "Please try again.");
    },
  });
  const createDemoVideo = trpc.model.createDemoVideo.useMutation({
    onSuccess: () => {
      setVideoForm({
        title: "",
        videoUrl: "",
        thumbnailUrl: "",
        durationSeconds: "",
      });
      void demoVideos.refetch();
      void stats.refetch();
      Alert.alert("Demo video submitted", "Your video was sent for review.");
    },
    onError: (error: unknown) => {
      Alert.alert("Unable to upload demo video", error instanceof Error ? error.message : "Please try again.");
    },
  });

  const levelData = (level.data ?? {}) as { level?: number; stats?: Record<string, unknown> | null };
  const statsData = (stats.data ?? {}) as {
    currentLevel?: number;
    totalDiamonds?: number;
    totalVideoMinutes?: number;
    totalAudioMinutes?: number;
    totalCallsCompleted?: number;
    totalGiftsReceived?: number;
    audioPrice?: number;
    videoPrice?: number;
    demoVideoCount?: number;
    isOnline?: boolean;
  };
  const availabilityData = (availability.data ?? {}) as {
    availabilityStatus?: string;
    isOnlineOverride?: boolean;
    schedule?: Array<{ dayOfWeek: ScheduleSlot["day"]; startTime: string; endTime: string; timezone: string }>;
    nextSlot?: { dayOfWeek: string; startTime: string; endTime: string; timezone: string } | null;
  };
  const demoRows = (demoVideos.data ?? []) as Array<Record<string, unknown>>;

  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [slotForm, setSlotForm] = useState<ScheduleSlot>({
    day: "MON",
    startTime: "18:00",
    endTime: "22:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [videoForm, setVideoForm] = useState({
    title: "",
    videoUrl: "",
    thumbnailUrl: "",
    durationSeconds: "",
  });
  const [applicationForm, setApplicationForm] = useState({
    legalName: "",
    phone: "",
    country: "India",
    stateRegion: "",
    address: "",
    email: "",
    nationalId: "",
    dob: "1998-01-01",
    agencyId: "",
  });
  const [documents, setDocuments] = useState({
    idFrontUrl: "",
    holdingIdUrl: "",
    selfieUrl: "",
  });

  useEffect(() => {
    const remoteSlots = (availabilityData.schedule ?? []).map((slot) => ({
      day: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone,
    }));
    setSchedule(remoteSlots);
  }, [availabilityData.schedule]);

  const currentLevel = Number(levelData.level ?? statsData.currentLevel ?? 1);
  const totalDiamonds = Number(statsData.totalDiamonds ?? 0);
  const totalVideoMinutes = Number(statsData.totalVideoMinutes ?? 0);
  const totalAudioMinutes = Number(statsData.totalAudioMinutes ?? 0);
  const totalCallsCompleted = Number(statsData.totalCallsCompleted ?? 0);
  const totalGiftsReceived = Number(statsData.totalGiftsReceived ?? 0);
  const availabilityStatus = availabilityData.availabilityStatus ?? "OFFLINE";
  const canSubmitVideo = Boolean(videoForm.videoUrl && videoForm.thumbnailUrl && videoForm.durationSeconds);
  const gemBalance = Math.max(0, totalDiamonds);

  const pickAndUploadImage = async (slot: "idFrontUrl" | "holdingIdUrl" | "selfieUrl") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow gallery access to upload your document.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "jpg");

    try {
      const uploaded = await uploadImage.mutateAsync({
        base64Data: asset.base64,
        fileName: asset.fileName?.trim() || `${slot}.${extension}`,
        mimeType,
      });
      setDocuments((current) => ({ ...current, [slot]: String(uploaded.avatarUrl) }));
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleSubmitApplication = () => {
    if (!applicationForm.legalName.trim() || !applicationForm.email.trim() || !applicationForm.stateRegion.trim() || !applicationForm.nationalId.trim()) {
      Alert.alert("Missing information", "Complete the required application fields before applying.");
      return;
    }
    if (!documents.idFrontUrl || !documents.holdingIdUrl || !documents.selfieUrl) {
      Alert.alert("Missing uploads", "Upload your ID image, holding photo, and selfie before applying.");
      return;
    }

    const dobValue = new Date(applicationForm.dob);
    if (Number.isNaN(dobValue.getTime())) {
      Alert.alert("Invalid date", "Enter your birth date using YYYY-MM-DD.");
      return;
    }

    submitApplication.mutate({
      legalName: applicationForm.legalName.trim(),
      displayName: applicationForm.legalName.trim(),
      talentDescription: applicationForm.agencyId.trim() ? `Agency application with ID ${applicationForm.agencyId.trim()}` : "Independent official talent application",
      talentCategories: [applicationForm.agencyId.trim() ? "Agency Talent" : "Official Talent"],
      languages: ["English", "Hindi"],
      country: applicationForm.country.trim(),
      city: applicationForm.stateRegion.trim(),
      dob: dobValue,
      introVideoUrl: documents.selfieUrl,
      idDocFrontUrl: documents.idFrontUrl,
      idDocBackUrl: documents.holdingIdUrl,
      scheduleJson: {
        phone: applicationForm.phone.trim() || null,
        address: applicationForm.address.trim() || null,
        email: applicationForm.email.trim(),
        nationalId: applicationForm.nationalId.trim(),
        agencyId: applicationForm.agencyId.trim() || null,
      },
    });
  };

  const handleAddSlot = () => {
    setSchedule((current) => [
      ...current,
      {
        ...slotForm,
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSchedule((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveSchedule = () => {
    updateAvailability.mutate({ schedule });
  };

  const handleSubmitVideo = () => {
    if (!canSubmitVideo) {
      return;
    }

    createDemoVideo.mutate({
      title: videoForm.title || undefined,
      videoUrl: videoForm.videoUrl,
      thumbnailUrl: videoForm.thumbnailUrl,
      durationSeconds: Number(videoForm.durationSeconds),
      displayOrder: demoRows.length,
    });
  };

  return (
    <Screen scroll>
      <Card style={{ marginBottom: SPACING.md, backgroundColor: "#0A1021", borderRadius: RADIUS.xl, padding: 0, overflow: "hidden" }}>
        <View style={{ padding: SPACING.md }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.white }}>Official Talent Instruction</Text>
        </View>
        <View style={{ backgroundColor: COLORS.white, padding: SPACING.md }}>
          <Text style={{ color: "#E63793", fontSize: 16, fontWeight: "800", marginBottom: SPACING.md }}>What you need to become an official talent</Text>

          <Text style={{ color: "#151515", fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Official Talent Requirements</Text>
          <Text style={{ color: "#262626", fontSize: 16, lineHeight: 24 }}>• If you have earned at least 200,000 gems, then you can apply to be an official talent.</Text>
          <Text style={{ color: "#E63793", fontSize: 18, fontWeight: "900", marginVertical: 10 }}>OR</Text>
          <Text style={{ color: "#262626", fontSize: 16, lineHeight: 24 }}>• If you have an Agency ID and agency you would like to join, you can apply with the Agency ID and join into an Agency right away.</Text>

          <Text style={{ color: "#151515", fontSize: 18, fontWeight: "800", marginTop: 18, marginBottom: 10 }}>Why should you become an official talent?</Text>
          <Text style={{ color: "#262626", fontSize: 16, lineHeight: 24 }}>• You can earn real money from streaming, receive allowance, and earn from the gems you collect.</Text>
          <Text style={{ color: "#262626", fontSize: 16, lineHeight: 24, marginTop: 8 }}>• Your stream can be promoted on popular and discovery surfaces when you broadcast.</Text>
          <Text style={{ color: "#262626", fontSize: 16, lineHeight: 24, marginTop: 8 }}>• Special placement, badges, training, and support are unlocked for approved talents.</Text>

          <Text style={{ color: "#B63A3A", fontSize: 15, fontWeight: "800", lineHeight: 24, marginTop: 18 }}>Notice: You must be 18+, child-related content is prohibited, and inactive talents may lose status after long inactivity.</Text>
        </View>
        <View style={{ padding: SPACING.md, backgroundColor: "#111623" }}>
          <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 15, textAlign: "center" }}>Current Gem Balance: {gemBalance} gems</Text>
          <Text style={{ color: "rgba(255,255,255,0.74)", fontSize: 15, textAlign: "center", marginTop: 4 }}>Gems Required to Apply: 200000 gems</Text>
          {applicationStatus.data ? (
            <View style={{ marginTop: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, backgroundColor: "rgba(255,255,255,0.06)" }}>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>Application Status: {String((applicationStatus.data as any)?.status ?? "SUBMITTED")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 6 }}>Submitted official talent application is now linked to your creator tools below.</Text>
            </View>
          ) : (
            <View style={{ marginTop: SPACING.md }}>
              <Button title={gemBalance >= 200_000 || applicationForm.agencyId.trim() ? "Apply now" : "Cannot apply"} onPress={() => {}} disabled={!(gemBalance >= 200_000 || applicationForm.agencyId.trim())} />
            </View>
          )}
        </View>
      </Card>

      {!applicationStatus.data ? (
        <Card style={{ marginBottom: SPACING.md, backgroundColor: "#0A1021", borderRadius: RADIUS.xl }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.white, marginBottom: SPACING.md }}>Apply to be an Official Talent</Text>

          <Input label="*Enter your real name" value={applicationForm.legalName} onChangeText={(value) => setApplicationForm((current) => ({ ...current, legalName: value }))} placeholder="Real name" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Enter your mobile/WhatsApp number" value={applicationForm.phone} onChangeText={(value) => setApplicationForm((current) => ({ ...current, phone: value }))} placeholder="Phone" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Select your country/region" value={applicationForm.country} onChangeText={(value) => setApplicationForm((current) => ({ ...current, country: value }))} placeholder="Country" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Please Select Your State/UT" value={applicationForm.stateRegion} onChangeText={(value) => setApplicationForm((current) => ({ ...current, stateRegion: value }))} placeholder="State / UT" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="Enter your address (optional)" value={applicationForm.address} onChangeText={(value) => setApplicationForm((current) => ({ ...current, address: value }))} placeholder="Address" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Enter your email address" value={applicationForm.email} onChangeText={(value) => setApplicationForm((current) => ({ ...current, email: value }))} placeholder="Email" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Enter your national ID number" value={applicationForm.nationalId} onChangeText={(value) => setApplicationForm((current) => ({ ...current, nationalId: value }))} placeholder="National ID" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Input label="*Enter your birth date" value={applicationForm.dob} onChangeText={(value) => setApplicationForm((current) => ({ ...current, dob: value }))} placeholder="YYYY-MM-DD" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Text style={{ color: "#FF6F82", marginBottom: SPACING.md }}>Application will be rejected if you upload invalid ID#</Text>

          {[
            { key: "idFrontUrl", title: "Click to upload national ID image", label: "National ID image" },
            { key: "holdingIdUrl", title: "Upload a photo of yourself holding your ID card", label: "Holding ID photo" },
            { key: "selfieUrl", title: "Upload self-taken photo", label: "Selfie" },
          ].map((item) => {
            const value = documents[item.key as keyof typeof documents];
            return (
              <TouchableOpacity key={item.key} onPress={() => void pickAndUploadImage(item.key as "idFrontUrl" | "holdingIdUrl" | "selfieUrl")} style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.3)", borderRadius: RADIUS.lg, minHeight: 180, marginBottom: SPACING.md, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#F7F7F8" }}>
                {value ? (
                  <Image source={{ uri: value }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center", paddingHorizontal: SPACING.md }}>
                    <Text style={{ color: "#E63595", fontSize: 46, fontWeight: "200" }}>+</Text>
                    <Text style={{ color: "#E63595", fontSize: 16, textDecorationLine: "underline", textAlign: "center", marginTop: 6 }}>{item.title}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.white, marginBottom: SPACING.md }}>Choose how you want to be paid</Text>
          <Text style={{ color: COLORS.white, fontSize: 16, marginBottom: 8 }}>* Select Payment Receival Type :</Text>
          <View style={{ flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md }}>
            {[
              { key: "self", label: "Self" },
              { key: "agency", label: "Via Agency" },
              { key: "third", label: "Trusted 3rd Party" },
            ].map((option) => (
              <TouchableOpacity key={option.key} onPress={() => setApplicationForm((current) => ({ ...current, agencyId: option.key === "agency" ? current.agencyId : "" }))} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#62DEFF", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                  {option.key === "self" ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#62DEFF" }} /> : null}
                </View>
                <Text style={{ color: COLORS.white }}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: COLORS.white, fontSize: 16, marginBottom: 8 }}>* Enter Agency ID</Text>
          <Input label="I want to join a MissUPro agency" value={applicationForm.agencyId} onChangeText={(value) => setApplicationForm((current) => ({ ...current, agencyId: value }))} placeholder="Agency ID" style={{ backgroundColor: "#0E162A", color: COLORS.white }} />
          <Button title={submitApplication.isPending ? "Applying..." : "Apply"} onPress={handleSubmitApplication} disabled={submitApplication.isPending} />
        </Card>
      ) : null}

      <Card style={{ marginBottom: SPACING.md, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl }}>
        <View style={{ alignItems: "center", paddingVertical: SPACING.md }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.white }}>Creator Level</Text>
          <Text style={{ fontSize: 34, fontWeight: "700", color: COLORS.white, marginTop: SPACING.xs }}>
            Level {currentLevel}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.white, opacity: 0.85, marginTop: 4 }}>
            Status: {availabilityStatus}
          </Text>
        </View>
      </Card>

      <SectionHeader title="Earnings" />
      <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Total Diamonds</Text>
          <DiamondDisplay amount={totalDiamonds} size="lg" />
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Gifts Received</Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text }}>{totalGiftsReceived}</Text>
        </Card>
      </View>

      <SectionHeader title="Call Performance" />
      <Card style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: SPACING.sm }}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text }}>{totalCallsCompleted}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Total Calls</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text }}>{totalVideoMinutes}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Video Min</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: COLORS.text }}>{totalAudioMinutes}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Audio Min</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Badge label={`Audio ${Number(statsData.audioPrice ?? 0)} coins/min`} />
          <Badge label={`Video ${Number(statsData.videoPrice ?? 0)} coins/min`} color={COLORS.success} />
        </View>
      </Card>

      <SectionHeader title="Availability" />
      <Card style={{ marginBottom: SPACING.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>{availabilityStatus}</Text>
            {availabilityData.nextSlot ? (
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                Next slot: {availabilityData.nextSlot.dayOfWeek} {availabilityData.nextSlot.startTime}-{availabilityData.nextSlot.endTime} {availabilityData.nextSlot.timezone}
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
                Add a weekly schedule to appear in discovery when you are available.
              </Text>
            )}
          </View>
          <Button
            title={availabilityData.isOnlineOverride ? "Go Offline" : "Go Online"}
            size="sm"
            onPress={() => setOnlineOverride.mutate({ isOnline: !availabilityData.isOnlineOverride })}
            loading={setOnlineOverride.isPending}
          />
        </View>

        <View style={{ gap: SPACING.sm }}>
          {schedule.map((slot, index) => (
            <View key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`} style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                {slot.day} {slot.startTime}-{slot.endTime}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>{slot.timezone}</Text>
              <Button
                title="Remove"
                variant="ghost"
                size="sm"
                onPress={() => handleRemoveSlot(index)}
                style={{ marginTop: SPACING.xs, alignSelf: "flex-start" }}
              />
            </View>
          ))}
        </View>

        <View style={{ marginTop: SPACING.md }}>
          <Input
            label="Day"
            value={slotForm.day}
            onChangeText={(value) => {
              const nextDay = DAY_OPTIONS.includes(value as ScheduleSlot["day"]) ? value as ScheduleSlot["day"] : "MON";
              setSlotForm((current) => ({ ...current, day: nextDay }));
            }}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Start Time"
                value={slotForm.startTime}
                onChangeText={(value) => setSlotForm((current) => ({ ...current, startTime: value }))}
                placeholder="18:00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="End Time"
                value={slotForm.endTime}
                onChangeText={(value) => setSlotForm((current) => ({ ...current, endTime: value }))}
                placeholder="22:00"
              />
            </View>
          </View>
          <Input
            label="Timezone"
            value={slotForm.timezone}
            onChangeText={(value) => setSlotForm((current) => ({ ...current, timezone: value }))}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button title="Add Slot" variant="secondary" onPress={handleAddSlot} style={{ flex: 1 }} />
            <Button title="Save Schedule" onPress={handleSaveSchedule} loading={updateAvailability.isPending} style={{ flex: 1 }} />
          </View>
        </View>
      </Card>

      <SectionHeader title="Demo Videos" />
      <Card style={{ marginBottom: SPACING.md }}>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
          Approved videos improve discovery ranking and help users understand your service before they call.
        </Text>
        {demoRows.map((video) => (
          <View key={String(video.id)} style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>{String(video.title ?? "Untitled demo video")}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>
              {String(video.status ?? "PENDING_REVIEW")} | {String(video.durationSeconds ?? 0)} sec
            </Text>
          </View>
        ))}
        {demoRows.length === 0 && (
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm }}>
            No demo videos uploaded yet.
          </Text>
        )}

        <Input
          label="Title"
          value={videoForm.title}
          onChangeText={(value) => setVideoForm((current) => ({ ...current, title: value }))}
          placeholder="Introduction video"
        />
        <Input
          label="Video URL"
          value={videoForm.videoUrl}
          onChangeText={(value) => setVideoForm((current) => ({ ...current, videoUrl: value }))}
          placeholder="https://cdn.example.com/video.mp4"
        />
        <Input
          label="Thumbnail URL"
          value={videoForm.thumbnailUrl}
          onChangeText={(value) => setVideoForm((current) => ({ ...current, thumbnailUrl: value }))}
          placeholder="https://cdn.example.com/thumb.jpg"
        />
        <Input
          label="Duration (seconds)"
          value={videoForm.durationSeconds}
          onChangeText={(value) => setVideoForm((current) => ({ ...current, durationSeconds: value }))}
          keyboardType="numeric"
          placeholder="60"
        />
        <Button title="Submit Demo Video" onPress={handleSubmitVideo} loading={createDemoVideo.isPending} disabled={!canSubmitVideo} />
      </Card>

      <SectionHeader title="Actions" />
      <Card style={{ marginBottom: SPACING.md }}>
        {creatorEconomy.data ? (
          <View style={{ marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
              Creator payout: 100 diamonds = ${creatorEconomy.data.diamondValueUsdPer100.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
              Withdrawal window: ${creatorEconomy.data.withdrawLimits.minUsd.toFixed(2)} min
              {creatorEconomy.data.withdrawLimits.maxUsd != null ? ` / $${creatorEconomy.data.withdrawLimits.maxUsd.toFixed(2)} max` : ""}
            </Text>
          </View>
        ) : null}
        <Button
          title="Request Withdrawal"
          variant="primary"
          onPress={() => router.push("/wallet" as never)}
          style={{ marginBottom: SPACING.sm }}
        />
        <Button
          title="Open Wallet"
          variant="secondary"
          onPress={() => router.push("/wallet" as never)}
        />
      </Card>
    </Screen>
  );
}
