import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card, Input, Screen } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store";
import { COLORS, SPACING } from "@/theme";

export default function EditProfileRoute() {
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const profile = trpc.user.getMyProfile.useQuery(undefined, { retry: false, enabled: isAuthenticated });
  const updateProfile = trpc.user.updateMyProfile.useMutation({
    onSuccess: () => {
      profile.refetch();
      router.back();
    },
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
    setAvatarUrl(String(profile.data.avatarUrl ?? ""));
  }, [profile.data]);

  if (!isAuthenticated) {
    return (
      <Screen scroll>
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>Sign in to edit your profile</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 8 }}>Profile editing is available only for authenticated accounts.</Text>
          <Button title="Go to Login" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll style={{ backgroundColor: "#0C1345" }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginBottom: 6 }}>Edit Profile</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginBottom: SPACING.lg }}>Update your public profile details and discovery presence.</Text>

        <Card style={{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="How viewers see you" />
          <Input label="Bio" value={bio} onChangeText={setBio} placeholder="Tell viewers what you do" multiline />
          <Input label="Location" value={locationDisplay} onChangeText={setLocationDisplay} placeholder="Visible location" />
          <Input label="City" value={city} onChangeText={setCity} placeholder="City" />
          <Input label="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://..." autoCapitalize="none" />
          <Button
            title="Save profile changes"
            onPress={() => updateProfile.mutate({ displayName, bio, locationDisplay, city, avatarUrl })}
            loading={updateProfile.isPending}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>
      </View>
    </Screen>
  );
}