import { Injectable } from "@nestjs/common";
import { getPresence, getPresenceBulk, setPresence } from "@missu/utils";

@Injectable()
export class PresenceService {
  async heartbeat(userId: string, status: string, ttlSeconds = 90) {
    await setPresence(userId, status, ttlSeconds);
    return { userId, status, ttlSeconds, updatedAt: new Date().toISOString() };
  }

  async getStatus(userId: string) {
    const status = await getPresence(userId);
    return { userId, status: status ?? "OFFLINE" };
  }

  async getBulk(userIds: string[]) {
    const statuses = await getPresenceBulk(userIds);
    return userIds.map((userId) => ({
      userId,
      status: statuses.get(userId) ?? "OFFLINE",
    }));
  }
}
