import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { EmptyState, Screen } from "@/components/ui";
import { COLORS } from "@/theme";

export default function PkResultsRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  useEffect(() => {
    if (sessionId) {
      router.replace(`/pk/battle?sessionId=${sessionId}` as never);
    }
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Screen>
        <EmptyState icon="⚔️" title="No PK result selected" subtitle="Open a PK battle first so the results route has a live session to display." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}