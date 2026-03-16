import { useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from "react-native-agora";

type CallRtcCredentials = {
  channel: string;
  agoraToken: string;
  agoraAppId: string;
};

type UseCallRtcArgs = {
  enabled: boolean;
  callType: "audio" | "video" | null;
  credentials?: CallRtcCredentials | null;
};

async function requestCallPermissions(callType: "audio" | "video" | null) {
  if (Platform.OS !== "android") {
    return true;
  }

  const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (callType === "video") {
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
}

function getStatusLabel(state: ConnectionStateType | null) {
  switch (state) {
    case ConnectionStateType.ConnectionStateConnected:
      return "connected";
    case ConnectionStateType.ConnectionStateConnecting:
    case ConnectionStateType.ConnectionStateReconnecting:
      return "connecting";
    case ConnectionStateType.ConnectionStateFailed:
      return "failed";
    default:
      return "idle";
  }
}

export function useCallRtc({ enabled, callType, credentials }: UseCallRtcArgs) {
  const engineRef = useRef<IRtcEngine | null>(null);
  const tokenRef = useRef<string | null>(credentials?.agoraToken ?? null);
  const [joined, setJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionStateType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [isLocalVideoMuted, setIsLocalVideoMuted] = useState(callType !== "video");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  useEffect(() => {
    setIsLocalVideoMuted(callType !== "video");
  }, [callType]);

  useEffect(() => {
    tokenRef.current = credentials?.agoraToken ?? null;
  }, [credentials?.agoraToken]);

  useEffect(() => {
    let cancelled = false;
    let handler: IRtcEngineEventHandler | null = null;
    const ignoreCleanupError = () => undefined;

    const cleanup = () => {
      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      try {
        if (callType === "video") {
          engine.stopPreview();
        }
      } catch {
        ignoreCleanupError();
      }

      try {
        engine.leaveChannel();
      } catch {
        ignoreCleanupError();
      }

      if (handler) {
        try {
          engine.unregisterEventHandler(handler);
        } catch {
          ignoreCleanupError();
        }
      }

      try {
        engine.release();
      } catch {
        ignoreCleanupError();
      }

      engineRef.current = null;
      setJoined(false);
      setRemoteUids([]);
      setConnectionState(null);
    };

    if (!enabled || !credentials || !callType) {
      cleanup();
      return cleanup;
    }

    if (!credentials.agoraAppId) {
      setError("RTC is not configured yet. Add Agora credentials on the API server.");
      cleanup();
      return cleanup;
    }

    setError(null);

    const joinCall = async () => {
      const granted = await requestCallPermissions(callType);
      if (!granted) {
        if (!cancelled) {
          setError(callType === "video"
            ? "Camera and microphone access are required for video calls."
            : "Microphone access is required for audio calls.");
        }
        return;
      }

      if (cancelled) {
        return;
      }

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      handler = {
        onJoinChannelSuccess: () => {
          if (!cancelled) {
            setJoined(true);
            setError(null);
          }
        },
        onUserJoined: (_connection, remoteUid) => {
          if (!cancelled) {
            setRemoteUids((current) => (current.includes(remoteUid) ? current : [...current, remoteUid]));
          }
        },
        onUserOffline: (_connection, remoteUid) => {
          if (!cancelled) {
            setRemoteUids((current) => current.filter((uid) => uid !== remoteUid));
          }
        },
        onLeaveChannel: () => {
          if (!cancelled) {
            setJoined(false);
            setRemoteUids([]);
          }
        },
        onConnectionStateChanged: (_connection, state) => {
          if (!cancelled) {
            setConnectionState(state);
          }
        },
        onError: (err) => {
          if (!cancelled) {
            setError(`RTC error ${String(err)}`);
          }
        },
      };

      engine.initialize({
        appId: credentials.agoraAppId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
      engine.registerEventHandler(handler);
      engine.enableAudio();
      engine.enableLocalAudio(true);
      engine.setDefaultAudioRouteToSpeakerphone(true);
      engine.setEnableSpeakerphone(true);
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      if (callType === "video") {
        engine.enableVideo();
        engine.enableLocalVideo(true);
        engine.muteLocalVideoStream(false);
        engine.startPreview();
      } else {
        engine.disableVideo();
      }

      engine.muteLocalAudioStream(false);

      const joinResult = engine.joinChannel(tokenRef.current ?? credentials.agoraToken, credentials.channel, 0, {
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: callType === "video",
        autoSubscribeAudio: true,
        autoSubscribeVideo: callType === "video",
        enableAudioRecordingOrPlayout: true,
      });

      if (joinResult < 0 && !cancelled) {
        setError(`Unable to join RTC channel (${joinResult}).`);
      }
    };

    void joinCall();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [callType, credentials?.agoraAppId, credentials?.channel, enabled]);

  const toggleLocalAudio = () => {
    if (!engineRef.current) {
      return;
    }

    const nextValue = !isLocalAudioMuted;
    engineRef.current.muteLocalAudioStream(nextValue);
    setIsLocalAudioMuted(nextValue);
  };

  const toggleLocalVideo = () => {
    if (!engineRef.current || callType !== "video") {
      return;
    }

    const nextValue = !isLocalVideoMuted;
    engineRef.current.muteLocalVideoStream(nextValue);
    engineRef.current.enableLocalVideo(!nextValue);
    setIsLocalVideoMuted(nextValue);
  };

  const toggleSpeaker = () => {
    if (!engineRef.current) {
      return;
    }

    const nextValue = !isSpeakerOn;
    engineRef.current.setEnableSpeakerphone(nextValue);
    setIsSpeakerOn(nextValue);
  };

  const switchCamera = () => {
    if (!engineRef.current || callType !== "video") {
      return;
    }

    engineRef.current.switchCamera();
  };

  const renewToken = (token: string) => {
    if (!engineRef.current) {
      return;
    }

    tokenRef.current = token;
    engineRef.current.renewToken(token);
    setError(null);
  };

  return useMemo(() => ({
    joined,
    remoteUids,
    statusLabel: getStatusLabel(connectionState),
    error,
    isLocalAudioMuted,
    isLocalVideoMuted,
    isSpeakerOn,
    toggleLocalAudio,
    toggleLocalVideo,
    toggleSpeaker,
    switchCamera,
    renewToken,
  }), [connectionState, error, isLocalAudioMuted, isLocalVideoMuted, isSpeakerOn, joined, remoteUids]);
}