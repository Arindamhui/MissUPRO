import { Screen, Card, SectionHeader } from "@/components/ui";
import { Text } from "react-native";

export default function GamesScreen() {
  return (
    <Screen scroll>
      <SectionHeader title="Games" />
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>In-call and room games</Text>
        <Text style={{ marginTop: 8 }}>Available game sessions are managed by backend game services and event configuration.</Text>
      </Card>
    </Screen>
  );
}
