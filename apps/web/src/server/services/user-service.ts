import { deleteCache, setCache, userProfileCacheKey, withCache } from "@missu/cache";
import { NotFoundError } from "@missu/utils";
import { userRepository } from "../repositories/user-repository";
import type { UpdateUserInput } from "../validators/auth";

export const userService = {
  async getMe(userId: string) {
    return withCache(userProfileCacheKey(userId), 300, async () => {
      const profile = await userRepository.getProfileById(userId);
      if (!profile.user) {
        throw new NotFoundError("User not found");
      }

      return {
        id: profile.user.id,
        publicId: profile.user.publicId ?? profile.user.publicUserId,
        email: profile.user.email,
        displayName: profile.user.displayName,
        username: profile.user.username,
        phone: profile.user.phone,
        role: profile.user.role,
        authProvider: profile.user.authProvider,
        country: profile.user.country,
        city: profile.user.city,
        preferredLocale: profile.user.preferredLocale,
        preferredTimezone: profile.user.preferredTimezone,
        host: profile.host
          ? {
              id: profile.host.id,
              publicId: profile.host.publicId ?? profile.host.hostId,
              agencyId: profile.host.agencyId,
              status: profile.host.status,
              type: profile.host.type,
            }
          : null,
      };
    });
  },

  async update(userId: string, input: UpdateUserInput) {
    const updated = await userRepository.update(userId, input);

    if (!updated) {
      throw new NotFoundError("User not found");
    }

    await deleteCache(userProfileCacheKey(userId));
    const me = await this.getMe(userId);
    await setCache(userProfileCacheKey(userId), me, 300);
    return me;
  },
};