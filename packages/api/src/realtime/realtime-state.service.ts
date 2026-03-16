import { Injectable } from "@nestjs/common";
import { getRedis } from "@missu/utils";

type RoomScope = "stream" | "party" | "group_audio" | "game" | "pk" | "user";

type RecentRealtimeEvent = {
  deliveryId: string;
  event: string;
  roomId: string;
  roomScope: RoomScope;
  payload: Record<string, unknown>;
  critical: boolean;
  createdAt: string;
};

@Injectable()
export class RealtimeStateService {
  private readonly roomTtlSeconds = 60 * 60;
  private readonly recentEventTtlSeconds = 10 * 60;
  private readonly pendingDeliveryTtlSeconds = 5 * 60;
  private readonly recentEventLimit = 50;

  private roomUserKey(scope: RoomScope, roomId: string) {
    return `realtime:room:${scope}:${roomId}:users`;
  }

  private roomSocketKey(scope: RoomScope, roomId: string) {
    return `realtime:room:${scope}:${roomId}:sockets`;
  }

  private socketRoomKey(socketId: string) {
    return `realtime:socket:${socketId}:rooms`;
  }

  private recentEventsKey(scope: RoomScope, roomId: string) {
    return `realtime:room:${scope}:${roomId}:recent_events`;
  }

  private pendingDeliveryKey(deliveryId: string) {
    return `realtime:delivery:${deliveryId}`;
  }

  private roomToken(scope: RoomScope, roomId: string) {
    return `${scope}:${roomId}`;
  }

  async joinRoom(scope: RoomScope, roomId: string, userId: string, socketId: string) {
    const redis = getRedis();
    const roomUsers = this.roomUserKey(scope, roomId);
    const roomSockets = this.roomSocketKey(scope, roomId);
    const socketRooms = this.socketRoomKey(socketId);
    const pipeline = redis.pipeline();
    pipeline.sadd(roomUsers, userId);
    pipeline.expire(roomUsers, this.roomTtlSeconds);
    pipeline.hset(roomSockets, socketId, userId);
    pipeline.expire(roomSockets, this.roomTtlSeconds);
    pipeline.sadd(socketRooms, this.roomToken(scope, roomId));
    pipeline.expire(socketRooms, this.roomTtlSeconds);
    await pipeline.exec();
  }

  async leaveRoom(scope: RoomScope, roomId: string, userId: string, socketId: string) {
    const redis = getRedis();
    const roomSockets = this.roomSocketKey(scope, roomId);
    const socketRooms = this.socketRoomKey(socketId);

    await redis.hdel(roomSockets, socketId);
    await redis.srem(socketRooms, this.roomToken(scope, roomId));

    const remainingSockets = await redis.hvals(roomSockets);
    if (!remainingSockets.includes(userId)) {
      await redis.srem(this.roomUserKey(scope, roomId), userId);
    }
  }

  async leaveAllRoomsForSocket(userId: string, socketId: string) {
    const redis = getRedis();
    const socketRoomsKey = this.socketRoomKey(socketId);
    const roomTokens = await redis.smembers(socketRoomsKey);

    for (const roomToken of roomTokens) {
      const [scope, roomId] = roomToken.split(":", 2) as [RoomScope, string];
      if (scope && roomId) {
        await this.leaveRoom(scope, roomId, userId, socketId);
      }
    }

    await redis.del(socketRoomsKey);
  }

  async getRoomOccupancy(scope: RoomScope, roomId: string) {
    const redis = getRedis();
    const [userIds, socketIds] = await Promise.all([
      redis.smembers(this.roomUserKey(scope, roomId)),
      redis.hkeys(this.roomSocketKey(scope, roomId)),
    ]);

    return {
      userIds,
      viewerCount: userIds.length,
      socketCount: socketIds.length,
    };
  }

  async appendRecentEvent(event: RecentRealtimeEvent) {
    const redis = getRedis();
    const key = this.recentEventsKey(event.roomScope, event.roomId);
    const serialized = JSON.stringify(event);

    const pipeline = redis.pipeline();
    pipeline.lpush(key, serialized);
    pipeline.ltrim(key, 0, this.recentEventLimit - 1);
    pipeline.expire(key, this.recentEventTtlSeconds);

    if (event.critical) {
      pipeline.set(this.pendingDeliveryKey(event.deliveryId), serialized, "EX", this.pendingDeliveryTtlSeconds);
    }

    await pipeline.exec();
  }

  async ackDelivery(deliveryId: string) {
    await getRedis().del(this.pendingDeliveryKey(deliveryId));
  }

  async getRecentEvents(scope: RoomScope, roomId: string, limit = 20) {
    const items = await getRedis().lrange(this.recentEventsKey(scope, roomId), 0, Math.max(0, limit - 1));
    return items.map((item) => JSON.parse(item) as RecentRealtimeEvent).reverse();
  }

  async getPendingDeliveries(scope: RoomScope, roomId: string, limit = 20) {
    const recent = await this.getRecentEvents(scope, roomId, limit * 2);
    const pendingIds = recent.filter((event) => event.critical).map((event) => event.deliveryId);
    if (pendingIds.length === 0) return [];

    const redis = getRedis();
    const pipeline = redis.pipeline();
    for (const deliveryId of pendingIds) {
      pipeline.get(this.pendingDeliveryKey(deliveryId));
    }

    const results = await pipeline.exec();
    return results
      ?.map((entry) => entry?.[1] as string | null)
      .filter((value): value is string => !!value)
      .map((value) => JSON.parse(value) as RecentRealtimeEvent)
      .slice(0, limit) ?? [];
  }
}