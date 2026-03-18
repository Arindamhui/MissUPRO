import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SearchInput, NeonEmptyState, WinterScreen } from "@/components/me-winter";
import { Avatar } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function RoomBlacklistScreen() {
  const [query, setQuery] = useState("");
  const blockedUsers = trpc.user.getBlockedUsers.useQuery(undefined, { retry: false });
  const unblockUser = trpc.user.unblockUser.useMutation({
    onSuccess: () => blockedUsers.refetch(),
  });

  const items = useMemo(() => (((blockedUsers.data ?? []) as any[]).filter((item) => {
    const haystack = `${String(item.displayName ?? item.username ?? "")} ${String(item.blockedUserId ?? "")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  })), [blockedUsers.data, query]);

  return (
    <WinterScreen title="Room Blacklist" rightLabel="Cancel" onRightPress={() => setQuery("")}>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search by user ID" />
      {items.length ? items.map((item: any) => (
        <View key={String(item.blockedUserId)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
          <Avatar uri={String(item.avatarUrl ?? "") || undefined} size={54} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{String(item.displayName ?? item.username ?? "Blocked user")}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>{String(item.blockedUserId ?? "")}</Text>
          </View>
          <TouchableOpacity onPress={() => unblockUser.mutate({ targetUserId: String(item.blockedUserId) })} style={{ borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )) : <NeonEmptyState title="You currently do not have a blacklist" />}
    </WinterScreen>
  );
}