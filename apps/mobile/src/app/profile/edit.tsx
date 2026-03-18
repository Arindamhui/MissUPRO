import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { Avatar, Button, Card } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, RADIUS, SPACING } from "@/theme";

function DetailRow({ label, value, trailing, onPress }: { label: string; value: string; trailing?: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1} style={{ paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: "rgba(255,255,255,0.54)", fontSize: 14 }}>{label}</Text>
        <Text style={{ color: COLORS.white, fontSize: 19, marginTop: 6 }}>{value || "-"}</Text>
      </View>
      {trailing ?? <MaterialCommunityIcons color="rgba(255,255,255,0.42)" name="chevron-right" size={24} />}
    </TouchableOpacity>
  );
}

export default function EditProfileRoute() {
  const insets = useSafeAreaInsets();
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const fallbackUserId = useAuthStore((s) => s.userId);
  const me = trpc.user.getMe.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const profile = trpc.user.getMyProfile.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const level = trpc.level.myLevel.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const uploadAvatar = trpc.media.uploadAvatar.useMutation();
  const updateProfile = trpc.user.updateMyProfile.useMutation({
    onSuccess: () => {
      profile.refetch();
      me.refetch();
      router.back();
    },
    onError: (error: unknown) => Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again."),
  });
  const persistAvatar = trpc.user.updateMyProfile.useMutation({
    onSuccess: () => {
      profile.refetch();
      me.refetch();
    },
    onError: (error: unknown) => Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again."),
  });
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [locationDisplay, setLocationDisplay] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setDisplayName(String(profile.data.displayName ?? ""));
    setBio(String(profile.data.bio ?? ""));
    setLocationDisplay(String(profile.data.locationDisplay ?? ""));
    setCity(String(profile.data.city ?? ""));
    setAvatarUrl(String(profile.data.avatarUrl ?? (profile.data as any)?.profileImage ?? ""));
  }, [profile.data]);

  const handlePickAvatar = async () => {
    if (uploadAvatar.isPending || persistAvatar.isPending) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery permission needed", "Allow photo access to choose a profile picture from your device.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Upload failed", "The selected image could not be prepared for upload. Please try another image.");
      return;
    }

    const mimeType = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const fallbackExtension = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "jpg");
    const fileName = asset.fileName?.trim() || `avatar.${fallbackExtension}`;

    try {
      const uploaded = await uploadAvatar.mutateAsync({
        base64Data: asset.base64,
        fileName,
        mimeType,
      });
      setAvatarUrl(uploaded.avatarUrl);
      await persistAvatar.mutateAsync({ avatarUrl: uploaded.avatarUrl });
      Alert.alert("Profile photo updated", "Your profile picture has been uploaded.");
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#081024", padding: SPACING.md, justifyContent: "center" }}>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>Sign in to edit your profile</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>Profile editing is available only for authenticated accounts.</Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </View>
    );
  }

  const accountId = String(me.data?.id ?? fallbackUserId ?? "");
  const country = String(profile.data?.country ?? me.data?.country ?? "India");
  const xp = Number((level.data as any)?.xp ?? 0);
  const nextLevel = (level.data as any)?.nextLevel;
  const starProgress = Math.min(100, nextLevel?.requiredXp ? Math.round((xp / Number(nextLevel.requiredXp)) * 100) : 0);
  const wealthProgress = Math.min(100, nextLevel?.progressPercent ?? starProgress);
  const introText = bio.trim();
  const profileCompleteness = useMemo(() => [displayName, bio, locationDisplay, city, avatarUrl].filter((value) => value.trim()).length, [avatarUrl, bio, city, displayName, locationDisplay]);

  return (
    <View style={{ flex: 1, backgroundColor: "#081024" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(6,11,30,0.92)", "rgba(6,11,30,0.98)"]} style={{ position: "absolute", inset: 0 }} />
      <AnimatedSnow density={6} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.md, marginBottom: 18 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
            <MaterialCommunityIcons color={COLORS.white} name="chevron-left" size={28} />
          </TouchableOpacity>
          <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "900" }}>Edit Profile</Text>
          <TouchableOpacity disabled={updateProfile.isPending || uploadAvatar.isPending || persistAvatar.isPending} onPress={() => updateProfile.mutate({ displayName, bio, locationDisplay, city, avatarUrl })}>
            <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: "500" }}>{updateProfile.isPending ? "Saving" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: SPACING.md, marginBottom: 18 }}>
          <Avatar uri={avatarUrl || undefined} size={128} />
          <TouchableOpacity
            onPress={() => void handlePickAvatar()}
            disabled={uploadAvatar.isPending || persistAvatar.isPending}
            style={{ marginTop: 14, minWidth: 180, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 18, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" }}
          >
            {uploadAvatar.isPending || persistAvatar.isPending ? <ActivityIndicator color={COLORS.white} style={{ marginRight: 10 }} /> : <MaterialCommunityIcons color={COLORS.white} name="image-plus" size={20} style={{ marginRight: 10 }} />}
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{uploadAvatar.isPending || persistAvatar.isPending ? "Uploading photo..." : "Choose From Gallery"}</Text>
          </TouchableOpacity>
          <Text style={{ color: "rgba(255,255,255,0.66)", fontSize: 13, marginTop: 10, textAlign: "center" }}>Pick a square photo from your phone and it will be uploaded as your profile picture.</Text>
        </View>

        <View style={{ backgroundColor: "#6B4693", paddingHorizontal: SPACING.md, paddingVertical: 18, marginBottom: 8 }}>
          <Text style={{ color: "rgba(255,255,255,0.92)", lineHeight: 24, fontSize: 15 }}>A normal user can modify his/her avatar or nickname at most once per natural month.</Text>
          <Text style={{ color: "rgba(255,255,255,0.92)", lineHeight: 24, fontSize: 15, marginTop: 8 }}>By becoming a VIP or SVIP user, a user may increase the limit to 5 times/30 times, respectively.</Text>
          <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800", marginTop: 12 }}>Buy/Renew VIP/SVIP</Text>
        </View>

        <View style={{ paddingHorizontal: SPACING.md }}>
          <Card style={{ backgroundColor: "rgba(4,8,22,0.72)", borderWidth: 0 }}>
            <DetailRow label="Nickname" value={displayName} />
            <DetailRow
              label="ID"
              value={accountId}
              trailing={
                <TouchableOpacity onPress={() => void Clipboard.setStringAsync(accountId)} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, overflow: "hidden" }}>
                  <LinearGradient colors={["#D24EFF", "#4EB8FF"]} style={{ position: "absolute", inset: 0, borderRadius: 22 }} />
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>Copy</Text>
                </TouchableOpacity>
              }
            />
            <DetailRow label="Gender" value={String(me.data?.gender ?? "Male")} />
            <DetailRow label="Region" value={country} />
            <DetailRow label="State" value={city || "Hide"} />
            <DetailRow label="Birthday" value={String(me.data?.dateOfBirth ?? "")} />
            <DetailRow label="Introduction" value={introText || "Add a short introduction"} />

            <View style={{ paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ color: "rgba(255,255,255,0.54)", fontSize: 14, marginBottom: 12 }}>Star</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ backgroundColor: "#FFD84C", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}><Text style={{ color: "#9C2C73", fontWeight: "700" }}>0</Text></View>
                <View style={{ flex: 1, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden", justifyContent: "center" }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${starProgress}%`, backgroundColor: "rgba(255,255,255,0.22)" }} />
                  <Text style={{ color: COLORS.white, textAlign: "center", fontSize: 13 }}>{nextLevel ? `${Number(nextLevel.requiredXp) - xp} exp to next lv` : "Max level reached"}</Text>
                </View>
                <View style={{ backgroundColor: "#FFD84C", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}><Text style={{ color: "#9C2C73", fontWeight: "700" }}>1</Text></View>
              </View>
            </View>

            <View style={{ paddingVertical: 20 }}>
              <Text style={{ color: "rgba(255,255,255,0.54)", fontSize: 14, marginBottom: 12 }}>Wealth</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ backgroundColor: "#2AAE3D", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}><Text style={{ color: COLORS.white, fontWeight: "700" }}>Lv {Number(level.data?.level ?? 1)}</Text></View>
                <View style={{ flex: 1, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden", justifyContent: "center" }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${wealthProgress}%`, backgroundColor: "rgba(255,255,255,0.22)" }} />
                  <Text style={{ color: COLORS.white, textAlign: "center", fontSize: 13 }}>{nextLevel ? `${Number(nextLevel.requiredXp)} exp to next lv` : "Profile complete"}</Text>
                </View>
                <View style={{ backgroundColor: "#2AAE3D", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}><Text style={{ color: COLORS.white, fontWeight: "700" }}>P{profileCompleteness}</Text></View>
              </View>
            </View>
          </Card>

          <Card style={{ backgroundColor: "rgba(4,8,22,0.72)", borderWidth: 0 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700", marginBottom: 10 }}>Editable fields</Text>
            {[
              { label: "Display name", value: displayName, setter: setDisplayName, placeholder: "Display name" },
              { label: "Avatar URL (optional)", value: avatarUrl, setter: setAvatarUrl, placeholder: "https://..." },
              { label: "Region", value: locationDisplay, setter: setLocationDisplay, placeholder: "Visible location" },
              { label: "State", value: city, setter: setCity, placeholder: "State / city" },
              { label: "Introduction", value: bio, setter: setBio, placeholder: "Tell viewers about yourself" },
            ].map((field) => (
              <View key={field.label} style={{ marginBottom: 12 }}>
                <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, marginBottom: 6 }}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.32)"
                  multiline={field.label === "Introduction"}
                  style={{
                    borderRadius: RADIUS.lg,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    color: COLORS.white,
                    paddingHorizontal: 14,
                    paddingVertical: field.label === "Introduction" ? 14 : 12,
                    minHeight: field.label === "Introduction" ? 88 : undefined,
                    textAlignVertical: field.label === "Introduction" ? "top" : "center",
                  }}
                />
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}