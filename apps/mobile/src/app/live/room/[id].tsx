import React from "react";
import { useLocalSearchParams } from "expo-router";
import { LiveRoomCatalogScreen } from "@/screens/catalog";

export default function LiveRoomRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <LiveRoomCatalogScreen roomId={id} />;
}