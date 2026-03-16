import { LiveRoomScreen } from "@/features/viewer-room/components/live-room-screen";

export default async function StreamPreviewPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  return <LiveRoomScreen streamId={streamId} />;
}