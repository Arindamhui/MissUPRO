import { Screen, Card, SectionHeader, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { Text } from "react-native";

export default function GiftsScreen() {
  const catalog = trpc.config.listGiftCatalog.useQuery(undefined, { retry: false });
  const rows = (catalog.data ?? []) as Array<{ displayName?: string; coinPrice?: number; diamondCredit?: number }>;

  return (
    <Screen scroll>
      <SectionHeader title="Gift Catalog" />
      {rows.length === 0 ? (
        <EmptyState icon="🎁" title="No Gifts Configured" subtitle="Gift catalog is loaded from backend configuration." />
      ) : (
        rows.map((gift, idx) => (
          <Card key={`${gift.displayName ?? "gift"}-${idx}`}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{gift.displayName ?? "Gift"}</Text>
            <Text style={{ marginTop: 6 }}>Coins: {gift.coinPrice ?? 0}</Text>
            <Text>Diamonds: {gift.diamondCredit ?? 0}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
