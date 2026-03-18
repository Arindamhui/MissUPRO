import { Injectable } from "@nestjs/common";
import { getEnv } from "@missu/config";
import * as AgoraToken from "agora-token";

@Injectable()
export class RtcTokenService {
  issueToken(channelName: string, uid: number, role: "publisher" | "subscriber" = "publisher", ttlSeconds = 3600) {
    const env = getEnv();
    const appId = env.AGORA_APP_ID?.trim() ?? "";
    const appCertificate = env.AGORA_APP_CERTIFICATE?.trim() ?? "";
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const hasRealAgoraConfig = Boolean(
      appId
      && appCertificate
      && appId !== "..."
      && appCertificate !== "...",
    );

    if (!hasRealAgoraConfig) {
      return {
        token: `dev-${channelName}-${uid}-${expiresAt}`,
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
      channelName,
      uid,
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
