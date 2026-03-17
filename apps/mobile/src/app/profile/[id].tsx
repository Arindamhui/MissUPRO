import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Badge, Card, Button, CoinDisplay, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useCallStore, useUIStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { SOCKET_EVENTS } from "@missu/types";
import { useAuthStore } from "@/store";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
  const { emit } = useSocket();
  const requestCall = trpc.calls.requestModelCall.useMutation();
  const followUser = trpc.user.followUser.useMutation();
  const unfollowUser = trpc.user.unfollowUser.useMutation();
  const profile = trpc.discovery.getModelCard.useQuery({ modelId: id! }, { retry: false, enabled: !!id && isAuthenticated });
  const model = profile.data as any;
  const modelUserId = String(model?.userId ?? "");
  const isFollowing = trpc.user.isFollowing.useQuery({ targetUserId: modelUserId }, { retry: false, enabled: !!modelUserId && isAuthenticated });
  const pricingPreview = trpc.calls.getCallPricingPreview.useQuery({ modelUserId }, { retry: false, enabled: !!modelUserId && isAuthenticated });

  const availability = trpc.user.getModelAvailability.useQuery(
    { modelUserId },
    { retry: false, enabled: !!model?.userId && isAuthenticated },
  );
  const reviews = trpc.user.getModelReviews.useQuery(
    { modelUserId, limit: 5 },
    { retry: false, enabled: !!model?.userId && isAuthenticated },
  );
  const demoVideos = trpc.user.getModelDemoVideos.useQuery(
    { modelUserId, status: "APPROVED" },
    { retry: false, enabled: !!model?.userId && isAuthenticated },
  );

  const availabilitySummary = availability.data as any;
  const reviewItems = (reviews.data?.items ?? []) as any[];
  const approvedVideos = (demoVideos.data ?? []) as any[];
  const averageRating = model?.avgRating
    ? Number(model.avgRating)
    : reviewItems.length > 0
      ? reviewItems.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviewItems.length
      : 0;
  const isCallable = availabilitySummary?.availabilityStatus === "AVAILABLE_NOW";
  const preview = pricingPreview.data as any;

  if (!isAuthenticated) {
    return (
      <Screen scroll>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>Sign in required</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>Creator profiles use protected data and call pricing previews. Sign in to open this screen fully.</Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  const startCall = (type: "audio" | "video") => {
    requestCall.mutate({ modelUserId, callType: type.toUpperCase() as "AUDIO" | "VIDEO" }, {
      onSuccess: (session: any) => {
        useCallStore.getState().startCall(session.id, type, modelUserId);
        emit(SOCKET_EVENTS.CALL.REQUEST, { targetUserId: modelUserId, callType: type, callSessionId: session.id });
        router.push(`/call/${session.id}`);
      },
      onError: (error: any) => {
        Alert.alert("Unable to start call", error?.message ?? "Try again in a moment.");
      },
    });
  };

  return (
    <Screen scroll>
      <View style={{ alignItems: "center", paddingVertical: SPACING.lg }}>
        <Avatar uri={model?.avatarUrl ?? model?.profileImage} size={120} online={model?.isOnline} />
        <Text style={{ fontSize: 24, fontWeight: "700", color: COLORS.text, marginTop: SPACING.md }}>
          {model?.displayName ?? "Model"}
        </Text>
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: "wrap", justifyContent: "center" }}>
          {model?.isOnline && <Badge text="Online" color={COLORS.success} />}
          <Badge text={`Lv.${model?.level ?? 1}`} color={COLORS.primary} />
          {availabilitySummary?.availabilityStatus && (
            <Badge
              text={String(availabilitySummary.availabilityStatus).replaceAll("_", " ")}
              color={availabilitySummary.availabilityStatus === "AVAILABLE_NOW" ? COLORS.success : COLORS.warning}
            />
          )}
        </View>
        {model?.bio && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: SPACING.sm, textAlign: "center", paddingHorizontal: SPACING.lg }}>
            {model.bio}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: SPACING.lg }}>
        {[
          { label: "Followers", value: model?.followerCount ?? 0 },
          { label: "Rating", value: averageRating > 0 ? `${averageRating.toFixed(1)} / 5` : "N/A" },
          { label: "Minutes", value: (model?.audioMinutesTotal ?? 0) + (model?.videoMinutesTotal ?? 0) },
        ].map((stat) => (
          <View key={stat.label} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{stat.value}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg }}>
        <Button
          title="Audio Call"
          onPress={() => startCall("audio")}
          style={{ flex: 1 }}
          variant="primary"
          disabled={!isCallable || requestCall.isPending || preview?.canStartAudio === false}
        />
        <Button
          title="Video Call"
          onPress={() => startCall("video")}
          style={{ flex: 1 }}
          variant="outline"
          disabled={!isCallable || requestCall.isPending || preview?.canStartVideo === false}
        />
      </View>

      {availabilitySummary?.nextSlot && (
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: SPACING.sm }}>Availability</Text>
          <Text style={{ color: COLORS.textSecondary }}>
            Next slot: {availabilitySummary.nextSlot.dayOfWeek} {availabilitySummary.nextSlot.startTime} ({availabilitySummary.nextSlot.timezone})
          </Text>
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: SPACING.sm }}>Call Pricing</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Audio</Text>
            <CoinDisplay amount={preview?.audioCoinsPerMinute ?? model?.audioPrice ?? 30} size="sm" />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>/min</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Video</Text>
            <CoinDisplay amount={preview?.videoCoinsPerMinute ?? model?.videoPrice ?? 50} size="sm" />
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>/min</Text>
          </View>
        </View>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.sm }}>
          Minimum balance required: {preview?.minimumBalanceCoins ?? 100} coins
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>
          Current balance: {preview?.currentBalanceCoins ?? 0} coins
        </Text>
      </Card>

      <TouchableOpacity
        onPress={() => useUIStore.getState().openGiftDrawer({ userId: modelUserId, context: "profile" })}
        style={{
          marginTop: SPACING.sm,
          padding: SPACING.md,
          borderRadius: RADIUS.lg,
          backgroundColor: COLORS.primaryLight,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>Gift</Text>
        <Text style={{ color: COLORS.primary, fontWeight: "600", marginTop: 4 }}>Send Gift</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
        <Button
          title={isFollowing.data?.isFollowing ? "Following" : "Follow"}
          variant="secondary"
          onPress={() => {
            const action = isFollowing.data?.isFollowing ? unfollowUser : followUser;
            action.mutate(
              { targetUserId: modelUserId },
              {
                onSuccess: () => {
                  isFollowing.refetch();
                  profile.refetch();
                },
              },
            );
          }}
          style={{ flex: 1 }}
          loading={followUser.isPending || unfollowUser.isPending}
        />
        <Button title="Message" variant="ghost" onPress={() => router.push(`/chat/${modelUserId}?recipientId=${modelUserId}`)} style={{ flex: 1 }} />
      </View>

      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm }}>
        <Button title="Followers" size="sm" variant="outline" onPress={() => router.push(`/profile/followers?userId=${modelUserId}`)} style={{ flex: 1 }} />
        <Button title="Following" size="sm" variant="outline" onPress={() => router.push(`/profile/following?userId=${modelUserId}`)} style={{ flex: 1 }} />
        <Button title="Edit" size="sm" variant="outline" onPress={() => router.push("/profile/edit")} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Demo Videos" />
      <Card>
        {approvedVideos.length > 0 ? (
          approvedVideos.map((video) => (
            <View
              key={String(video.id)}
              style={{
                paddingVertical: SPACING.sm,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>
                {video.title ?? "Demo video"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>
                {video.durationSeconds}s
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>No approved demo videos yet.</Text>
        )}
      </Card>

      <SectionHeader title="Reviews" />
      <Card>
        {reviewItems.length > 0 ? (
          reviewItems.map((review) => (
            <View
              key={String(review.id)}
              style={{
                paddingVertical: SPACING.sm,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
                {`${Number(review.rating ?? 0).toFixed(1)} / 5`}
              </Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>
                {review.reviewText ?? "No written review provided."}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: COLORS.textSecondary }}>No reviews yet.</Text>
        )}
      </Card>
    </Screen>
  );
}
