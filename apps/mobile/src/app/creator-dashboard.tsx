import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
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
  const level = trpc.model.getMyLevel.useQuery(undefined, { retry: false });
  const stats = trpc.model.getMyStats.useQuery(undefined, { retry: false });
  const availability = trpc.model.getMyAvailability.useQuery(undefined, { retry: false });
  const demoVideos = trpc.model.getMyDemoVideos.useQuery(undefined, { retry: false });
  const creatorEconomy = trpc.config.getCreatorEconomy.useQuery(getMobileRuntimeScope(), { retry: false });
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
