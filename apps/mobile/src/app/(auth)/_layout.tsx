import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/store";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const authMode = useAuthStore((s) => s.authMode);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn || authMode === "guest") {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
