import { useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

let ChannelProfileType: any = {};
let ClientRoleType: any = {};
let ConnectionStateType: any = {};
let createAgoraRtcEngine: any = null;
type IRtcEngine = any;
type IRtcEngineEventHandler = any;
try {
  const agora = require("react-native-agora");
  ChannelProfileType = agora.ChannelProfileType;
  ClientRoleType = agora.ClientRoleType;
  ConnectionStateType = agora.ConnectionStateType;
  createAgoraRtcEngine = agora.createAgoraRtcEngine;
} catch {
  // react-native-agora not linked (Expo Go)
}

type LiveRtcRole = "host" | "viewer";

export type LiveRtcCredentials = {
  channel: string;
  agoraToken: string;
  agoraAppId: string;
};

type UseLiveRtcArgs = {
  enabled: boolean;
  role: LiveRtcRole;
  credentials?: LiveRtcCredentials | null;
};

function getRoleLabel(state: ConnectionStateType | null) {
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

async function requestHostPermissions() {
  if (Platform.OS !== "android") {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  return Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
}

export function useLiveRtc({ enabled, role, credentials }: UseLiveRtcArgs) {
  const engineRef = useRef<IRtcEngine | null>(null);
  const [joined, setJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionStateType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(role !== "host");
  const [isLocalVideoMuted, setIsLocalVideoMuted] = useState(role !== "host");

  useEffect(() => {
    setIsLocalAudioMuted(role !== "host");
    setIsLocalVideoMuted(role !== "host");
  }, [role]);

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
        if (role === "host") {
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

    if (!enabled || !credentials) {
      cleanup();
      return cleanup;
    }

    if (!credentials.agoraAppId) {
      setError("RTC is not configured yet. Add Agora credentials on the API server.");
      cleanup();
      return cleanup;
    }

    setError(null);

    const joinRtc = async () => {
      if (role === "host") {
        const granted = await requestHostPermissions();
        if (!granted) {
          if (!cancelled) {
            setError("Camera and microphone access are required to go live.");
          }
          return;
        }
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
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
      engine.registerEventHandler(handler);
      engine.enableVideo();
      engine.enableAudio();
      engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);

      if (role === "host") {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableLocalVideo(true);
        engine.enableLocalAudio(true);
        engine.muteLocalAudioStream(false);
        engine.muteLocalVideoStream(false);
        engine.startPreview();
      } else {
        engine.setClientRole(ClientRoleType.ClientRoleAudience);
        engine.enableLocalVideo(false);
        engine.enableLocalAudio(false);
        engine.muteLocalAudioStream(true);
        engine.muteLocalVideoStream(true);
      }

      const joinResult = engine.joinChannel(credentials.agoraToken, credentials.channel, 0, {
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        clientRoleType: role === "host"
          ? ClientRoleType.ClientRoleBroadcaster
          : ClientRoleType.ClientRoleAudience,
        publishCameraTrack: role === "host",
        publishMicrophoneTrack: role === "host",
        autoSubscribeAudio: true,
        autoSubscribeVideo: true,
        enableAudioRecordingOrPlayout: true,
        isInteractiveAudience: role !== "host",
      });

      if (joinResult < 0 && !cancelled) {
        setError(`Unable to join RTC channel (${joinResult}).`);
      }
    };

    void joinRtc();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [credentials, enabled, role]);

  const toggleLocalAudio = () => {
    if (role !== "host" || !engineRef.current) {
      return;
    }

    const nextValue = !isLocalAudioMuted;
    engineRef.current.muteLocalAudioStream(nextValue);
    setIsLocalAudioMuted(nextValue);
  };

  const toggleLocalVideo = () => {
    if (role !== "host" || !engineRef.current) {
      return;
    }

    const nextValue = !isLocalVideoMuted;
    engineRef.current.muteLocalVideoStream(nextValue);
    engineRef.current.enableLocalVideo(!nextValue);
    setIsLocalVideoMuted(nextValue);
  };

  const switchCamera = () => {
    if (role !== "host" || !engineRef.current) {
      return;
    }

    engineRef.current.switchCamera();
  };

  return useMemo(() => ({
    joined,
    remoteUids,
    statusLabel: getRoleLabel(connectionState),
    error,
    isLocalAudioMuted,
    isLocalVideoMuted,
    toggleLocalAudio,
    toggleLocalVideo,
    switchCamera,
  }), [connectionState, error, isLocalAudioMuted, isLocalVideoMuted, joined, remoteUids]);
}