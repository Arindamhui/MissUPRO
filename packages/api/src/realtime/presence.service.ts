import { Injectable } from "@nestjs/common";
import { setPresence, getPresence, getPresenceBulk } from "@missu/utils";
import { PRESENCE } from "@missu/config";

@Injectable()
export class PresenceService {
  async setOnline(userId: string) {
    await setPresence(userId, "online", PRESENCE.TTL_SECONDS);
  }

  async setOffline(userId: string) {
    await setPresence(userId, "offline", PRESENCE.DISCONNECT_GRACE_SECONDS);
  }

  async setInCall(userId: string) {
    await setPresence(userId, "in_call", PRESENCE.TTL_SECONDS);
  }

  async setInStream(userId: string) {
    await setPresence(userId, "in_stream", PRESENCE.TTL_SECONDS);
  }

  async getStatus(userId: string) {
    return getPresence(userId);
  }

  async getBulkStatus(userIds: string[]) {
    return getPresenceBulk(userIds);
  }
}
