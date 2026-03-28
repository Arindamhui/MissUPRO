import { Injectable } from "@nestjs/common";
import { getEnv } from "@missu/config";
import * as AgoraToken from "agora-token";

@Injectable()
export class RtcTokenService {
  issueToken(channelName: string, uid: number, role: "publisher" | "subscriber" = "publisher", ttlSeconds = 3600) {
    // Validate channel name to prevent injection
    const sanitizedChannel = channelName.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 64);
    if (!sanitizedChannel) {
      throw new Error("Invalid channel name");
    }

    // Validate uid is a non-negative integer
    const safeUid = Math.max(0, Math.floor(uid));

    // Bound TTL between 60s and 24h
    const safeTtl = Math.min(Math.max(ttlSeconds, 60), 86400);

    const env = getEnv();
    const appId = env.AGORA_APP_ID?.trim() ?? "";
    const appCertificate = env.AGORA_APP_CERTIFICATE?.trim() ?? "";
    const expiresAt = Math.floor(Date.now() / 1000) + safeTtl;
    const hasRealAgoraConfig = Boolean(
      appId
      && appCertificate
      && appId !== "..."
      && appCertificate !== "...",
    );

    if (!hasRealAgoraConfig) {
      return {
        token: `dev-${sanitizedChannel}-${safeUid}-${expiresAt}`,
        appId: "",
        expiresAt,
      };
    }

    const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
    const RtcRole = AgoraToken.RtcRole;

    const agoraRole = role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      sanitizedChannel,
      safeUid,
      agoraRole,
      expiresAt,
      expiresAt,
    );

    return {
      token,
      appId,
      expiresAt,
    };
  }
}
