import React, { useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC from "../../../lib/agora";
import { useAuth } from "../../../context/Authcotext.jsx";
import axios from "axios";
import { ensureAVPermission } from "../../../utils/mediaPermissions";
import {
    Phone,
    PhoneOff,
    PhoneCall,
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
} from "lucide-react";
import "./CallModal.css";
import toast from "react-hot-toast";

// Simple presence using existing socket rooms: we assume target user joins their own id room at setup
// Backend already emits user-online/user-offline; we mirror that in UI.

const API_BASE = import.meta.env.VITE_BACKEND_API_URL;
const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

// Simple id generator without external deps
const genId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const VideoCallBox = ({ payload = {}, onClose }) => {
    const { user, socket, activeChatId, chatList, nonFriends } = useAuth();
    const [inCall, setInCall] = useState(false);
    const [rtc, setRtc] = useState(null); // { appId, token, channel, uid }
    const [status, setStatus] = useState(
        payload?.incoming ? "ringing" : "idle"
    ); // idle | calling | ringing | connected | declined
    const [peerId, setPeerId] = useState(payload?.from || null);
    const [callId, setCallId] = useState(payload?.callId || null);
    const [channel, setChannel] = useState(payload?.channel || null);
    const [timeLeft, setTimeLeft] = useState(10 * 60); // seconds
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    // Use a numeric Agora UID (required when server token is generated with buildTokenWithUid)
    const [rtcUid] = useState(() => Math.floor(Math.random() * 2147483647) + 1);
    // Guard to prevent rapid double-invites
    const [isStarting, setIsStarting] = useState(false);

    // Agora client/track refs
    const clientRef = useRef(null);
    const localAudioRef = useRef(null);
    const localVideoTrackRef = useRef(null);
    const localMicTrackRef = useRef(null);
    const remoteUsersRef = useRef(new Map()); // uid -> { videoTrack, audioTrack }
    const blockedAudioTracksRef = useRef(new Set()); // tracks that failed to autoplay
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [infoMsg, setInfoMsg] = useState("");
    const localContainerRef = useRef(null);
    const remoteContainerRef = useRef(null);
    const oneMinuteWarnedRef = useRef(false);

    // Determine other participant from activeChat
    const otherUser = useMemo(() => {
        const findById = (id) => {
            if (!id) return null;
            for (const c of chatList || []) {
                if (Array.isArray(c?.members)) {
                    const u = c.members.find((m) => m?._id === id);
                    if (u) return u;
                }
            }
            if (Array.isArray(nonFriends)) {
                const u = nonFriends.find((n) => n?._id === id);
                if (u) return u;
            }
            return null;
        };

        const incomingUser = payload?.incoming ? findById(payload?.from) : null;
        if (incomingUser) return incomingUser;

        const chat = chatList?.find((c) => c._id === activeChatId);
        if (chat && chat.members && chat.members.length === 2) {
            const other = chat.members.find((m) => m._id !== user._id);
            if (other) return other;
        }
        const nf = Array.isArray(nonFriends)
            ? nonFriends.find((n) => n._id === activeChatId)
            : null;
        if (nf) return nf;
        return payload?.user || null;
    }, [
        activeChatId,
        chatList,
        nonFriends,
        payload?.user,
        payload?.incoming,
        payload?.from,
        user?._id,
    ]);

    // Immediate guard: if this is an outgoing call and the target user is offline,
    // show a toast and close the overlay instead of opening the call UI.
    useEffect(() => {
        if (!payload?.incoming && otherUser && otherUser.isOnline === false) {
            const name = otherUser.fullname || otherUser.username || "User";
            toast.error(
                `${name} is offline. You can't place a call right now.`
            );
            onClose && onClose();
        }
        // We intentionally run this when otherUser resolves or payload changes
        // to catch late-arriving data.
    }, [payload?.incoming, otherUser, onClose]);

    useEffect(() => {
        if (!socket || !user?._id) return;
        // Listen for server-driven end-call
        const onEnd = (data) => {
            if (!callId || data?.callId !== callId) return;
            endCallLocal();
        };
        socket.on("end-call", onEnd);

        // Incoming invites handled elsewhere; this box is for outgoing/init UI
        const onAccept = async ({ callId: cid, channel: ch }) => {
            if (callId && cid !== callId) return;
            // Fetch token and join
            try {
                const r = await axios.get(`${API_BASE}/call/token`, {
                    params: { uid: rtcUid, channel: ch },
                });
                setRtc({
                    appId: r.data.appId || APP_ID,
                    token: r.data.rtcToken,
                    channel: ch,
                    uid: rtcUid,
                });
                setStatus("connected");
                setInCall(true);
            } catch (e) {
                console.error(e);
            }
        };
        socket.on("call-accept", onAccept);

        const onDecline = ({ callId: cid, reason }) => {
            if (callId && cid !== callId) return;
            if (reason === "offline") {
                const name =
                    otherUser?.fullname || otherUser?.username || "User";
                toast.error(`${name} is offline. Call cancelled.`);
                setStatus("idle");
                onClose && onClose();
                return;
            }
            setStatus("declined");
        };
        socket.on("call-decline", onDecline);

        return () => {
            socket.off("end-call", onEnd);
            socket.off("call-accept", onAccept);
            socket.off("call-decline", onDecline);
        };
    }, [socket, user?._id, otherUser?._id, callId]);

    // Auto-cancel if callee goes offline while we're calling/ringing
    useEffect(() => {
        if (!socket || !otherUser?._id) return;
        const handleOffline = (id) => {
            if (id !== otherUser._id) return;
            if (status === "calling" || status === "ringing") {
                toast.error(
                    `${
                        otherUser?.fullname || otherUser?.username || "User"
                    } is offline. Call cancelled.`
                );
                setStatus("idle");
                onClose && onClose();
            }
        };
        socket.on("user-offline", handleOffline);
        return () => socket.off("user-offline", handleOffline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, otherUser?._id, status]);

    // Auto-close after showing declined for a short moment (caller side)
    useEffect(() => {
        if (status !== "declined") return;
        const t = setTimeout(() => {
            setStatus("idle");
            onClose && onClose();
        }, 2000);
        return () => clearTimeout(t);
    }, [status, onClose]);

    // When status returns to idle (cancelled/closed), allow starting again
    useEffect(() => {
        if (status === "idle") setIsStarting(false);
    }, [status]);

    // countdown timer when connected
    useEffect(() => {
        if (!inCall) return;
        setTimeLeft(10 * 60);
        oneMinuteWarnedRef.current = false;
        const t = setInterval(() => {
            setTimeLeft((s) => {
                if (s <= 1) {
                    clearInterval(t);
                    // Ask server to end, then local
                    axios
                        .post(`${API_BASE}/call/end`, { callId })
                        .catch(() => {});
                    endCallLocal();
                    return 0;
                }
                // 1-minute remaining reminder
                if (s === 61 && !oneMinuteWarnedRef.current) {
                    oneMinuteWarnedRef.current = true;
                    toast("1 minute remaining in this call", {
                        icon: "⏳",
                        duration: 4000,
                        style: {
                            background: "#fff3cd",
                            color: "#664d03",
                            border: "1px solid #ffe69c",
                        },
                    });
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [inCall, callId]);

    // Show a warning toast as soon as call connects
    useEffect(() => {
        if (status === "connected") {
            toast("Call limit is 10 minutes", {
                icon: "⚠️",
                duration: 5000,
                style: {
                    background: "#fff3cd",
                    color: "#664d03",
                    border: "1px solid #ffe69c",
                },
            });
        }
    }, [status]);

    // Join/leave Agora lifecycle
    useEffect(() => {
        const join = async () => {
            if (!inCall || !rtc) return;
            // init client
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            clientRef.current = client;

            const tryPlayRemoteAudio = async (audioTrack) => {
                try {
                    await audioTrack.play();
                    return true;
                } catch (e) {
                    // Browser autoplay policy may block this without a user gesture
                    console.warn(
                        "Remote audio autoplay blocked:",
                        e?.message || e
                    );
                    blockedAudioTracksRef.current.add(audioTrack);
                    setAudioBlocked(true);
                    return false;
                }
            };

            client.on("user-published", async (user, mediaType) => {
                try {
                    await client.subscribe(user, mediaType);
                    const container = remoteContainerRef.current;
                    if (mediaType === "video" && user.videoTrack && container) {
                        // Clear previous
                        container.innerHTML = "";
                        user.videoTrack.play(container);
                    }
                    if (mediaType === "audio" && user.audioTrack) {
                        await tryPlayRemoteAudio(user.audioTrack);
                    }
                } catch (err) {
                    console.error("subscribe error", err);
                }
            });

            client.on("user-unpublished", (user, mediaType) => {
                // noop; SDK handles stop
            });

            await client.join(rtc.appId, rtc.channel, rtc.token, rtc.uid);

            // Create/publish microphone first so call can proceed even if camera fails
            try {
                const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
                localMicTrackRef.current = micTrack;
                await client.publish([micTrack]);
            } catch (err) {
                console.error("Failed to create/publish microphone track", err);
                // Mic is essential for a call; terminate gracefully
                try {
                    if (callId) {
                        await axios.post(`${API_BASE}/call/end`, { callId });
                    }
                } catch {}
                await endCallLocal();
                return;
            }

            // Helper: create and publish camera with fallbacks
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
            const createAndPublishCameraTrack = async () => {
                // First try default camera
                try {
                    // Small delay can help on Windows after releasing a temp stream
                    await sleep(200);
                    const track = await AgoraRTC.createCameraVideoTrack();
                    localVideoTrackRef.current = track;
                    if (localContainerRef.current) {
                        localContainerRef.current.innerHTML = "";
                        track.play(localContainerRef.current);
                    }
                    await client.publish([track]);
                    setInfoMsg("");
                    return true;
                } catch (err) {
                    // Detailed diagnostics
                    console.warn("Default camera failed", {
                        name: err?.name,
                        message: err?.message,
                        err,
                    });
                    // Try enumerating cameras and selecting explicitly
                    try {
                        const devices = await AgoraRTC.getCameras();
                        console.log("Available cameras", devices);
                        for (const d of devices) {
                            try {
                                const track =
                                    await AgoraRTC.createCameraVideoTrack({
                                        cameraId: d.deviceId,
                                    });
                                localVideoTrackRef.current = track;
                                if (localContainerRef.current) {
                                    localContainerRef.current.innerHTML = "";
                                    track.play(localContainerRef.current);
                                }
                                await client.publish([track]);
                                setInfoMsg("");
                                return true;
                            } catch (inner) {
                                console.warn(
                                    `Camera device failed (${d.label})`,
                                    {
                                        name: inner?.name,
                                        message: inner?.message,
                                    }
                                );
                            }
                        }
                    } catch (enumErr) {
                        console.warn("Enumerate cameras failed", enumErr);
                    }

                    // Surface a helpful message based on error type
                    const n = err?.name || "UnknownError";
                    let msg =
                        "Camera unavailable or blocked. Continuing audio-only.";
                    if (n === "NotReadableError" || n === "TrackStartError") {
                        msg =
                            "Camera appears to be in use by another app (Zoom/Teams/OBS). Close it and try again.";
                    } else if (n === "OverconstrainedError") {
                        msg =
                            "The requested camera settings aren't supported. Try a different camera in your OS/browser settings.";
                    } else if (
                        n === "NotAllowedError" ||
                        n === "SecurityError"
                    ) {
                        msg =
                            "Camera permission denied or blocked. Check browser site permissions and Windows privacy settings.";
                    } else if (
                        typeof window !== "undefined" &&
                        !window.isSecureContext
                    ) {
                        msg =
                            "This page isn't in a secure context. Use https or localhost to access the camera.";
                    }
                    setCamOn(false);
                    setInfoMsg(msg);
                    return false;
                }
            };

            // Try to create/publish camera; if it fails, continue audio-only
            await createAndPublishCameraTrack();
        };

        const leave = async () => {
            try {
                if (localVideoTrackRef.current) {
                    localVideoTrackRef.current.stop();
                    localVideoTrackRef.current.close();
                }
                if (localMicTrackRef.current) {
                    localMicTrackRef.current.stop();
                    localMicTrackRef.current.close();
                }
                if (clientRef.current) {
                    await clientRef.current.leave();
                    clientRef.current.removeAllListeners();
                }
            } catch (e) {
                // ignore
            }
        };

        if (inCall && rtc) {
            join();
        }
        return () => {
            if (!inCall) {
                leave();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inCall, rtc?.appId, rtc?.channel, rtc?.token, rtc?.uid]);

    const startCall = async () => {
        if (isStarting) return; // prevent double click
        if (!otherUser?._id) return;
        if (otherUser?.isOnline === false) {
            const name = otherUser?.fullname || otherUser?.username || "User";
            toast.error(
                `${name} is offline. You can't place a call right now.`
            );
            onClose && onClose();
            return;
        }
        // Ask for mic+camera before sending invite so user sees prompt early
        const perm = await ensureAVPermission();
        if (!perm.ok) {
            alert(
                perm.error ||
                    "Mic and camera permission are required to start a video call."
            );
            return;
        }
        setIsStarting(true);
        const cid = genId();
        const ch = `call_${cid}`;
        setCallId(cid);
        setChannel(ch);
        setPeerId(otherUser._id);
        setStatus("calling");

        // notify callee via socket signaling
        socket.emit("call-invite", {
            to: otherUser._id,
            from: user._id,
            callId: cid,
            channel: ch,
            kind: "video",
        });

        // If callee accepts, server will relay and this component will handle in onAccept
        // Also prefetch token for caller when accepted; not needed now
    };

    const acceptIncoming = async () => {
        // For symmetry if used as incoming UI in future
        if (!channel) return;
        const perm = await ensureAVPermission();
        if (!perm.ok) {
            alert(
                perm.error ||
                    "Mic and camera permission are required to join the video call."
            );
            if (peerId) {
                socket.emit("call-decline", {
                    to: peerId,
                    from: user._id,
                    callId,
                });
            }
            setStatus("idle");
            return;
        }
        try {
            await axios.post(`${API_BASE}/call/start`, {
                callId,
                channel,
                callerId: peerId,
                calleeId: user._id,
            });
            const r = await axios.get(`${API_BASE}/call/token`, {
                params: { uid: rtcUid, channel },
            });
            setRtc({
                appId: r.data.appId || APP_ID,
                token: r.data.rtcToken,
                channel,
                uid: rtcUid,
            });
            socket.emit("call-accept", {
                to: peerId,
                from: user._id,
                callId,
                channel,
            });
            setStatus("connected");
            setInCall(true);
        } catch (e) {
            console.error(e);
        }
    };

    const declineIncoming = () => {
        if (!peerId) return;
        socket.emit("call-decline", { to: peerId, from: user._id, callId });
        setStatus("idle");
        onClose && onClose();
    };

    const leaveAgora = async () => {
        try {
            if (localVideoTrackRef.current) {
                localVideoTrackRef.current.stop();
                localVideoTrackRef.current.close();
                localVideoTrackRef.current = null;
            }
            if (localMicTrackRef.current) {
                localMicTrackRef.current.stop();
                localMicTrackRef.current.close();
                localMicTrackRef.current = null;
            }
            if (clientRef.current) {
                await clientRef.current.leave();
                clientRef.current.removeAllListeners();
                clientRef.current = null;
            }
        } catch {}
    };

    const endCallLocal = async () => {
        await leaveAgora();
        setInCall(false);
        setRtc(null);
        setStatus("idle");
        if (onClose) onClose();
    };

    // Unmount cleanup
    useEffect(() => {
        return () => {
            leaveAgora();
        };
    }, []);

    // If unmounted while ringing as receiver, emit decline so caller gets feedback
    const statusRef = useRef(status);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);
    useEffect(() => {
        return () => {
            if (
                payload?.incoming &&
                statusRef.current === "ringing" &&
                peerId
            ) {
                try {
                    socket?.emit("call-decline", {
                        to: peerId,
                        from: user?._id,
                        callId,
                    });
                } catch {}
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const endButton = (
        <button
            onClick={async () => {
                try {
                    await axios.post(`${API_BASE}/call/end`, { callId });
                } catch {}
                await endCallLocal();
            }}
            title="Hang up"
            style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#e74c3c",
                color: "white",
                border: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <PhoneOff size={18} />
        </button>
    );

    const toggleMic = async () => {
        const next = !micOn;
        setMicOn(next);
        if (localMicTrackRef.current) {
            try {
                await localMicTrackRef.current.setEnabled(next);
            } catch {}
        }
    };

    const toggleCam = async () => {
        const next = !camOn;
        setCamOn(next);
        try {
            if (next) {
                // Turning camera ON
                if (!localVideoTrackRef.current && clientRef.current) {
                    // Reuse the join-time helper by reconstructing a minimal one here
                    const client = clientRef.current;
                    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
                    const tryEnable = async () => {
                        try {
                            await sleep(200);
                            const track =
                                await AgoraRTC.createCameraVideoTrack();
                            localVideoTrackRef.current = track;
                            if (localContainerRef.current) {
                                localContainerRef.current.innerHTML = "";
                                track.play(localContainerRef.current);
                            }
                            await client.publish([track]);
                            setInfoMsg("");
                            return true;
                        } catch (err) {
                            console.warn("Enable camera failed", {
                                name: err?.name,
                                message: err?.message,
                            });
                            try {
                                const devices = await AgoraRTC.getCameras();
                                console.log("Available cameras", devices);
                                for (const d of devices) {
                                    try {
                                        const track =
                                            await AgoraRTC.createCameraVideoTrack(
                                                {
                                                    cameraId: d.deviceId,
                                                }
                                            );
                                        localVideoTrackRef.current = track;
                                        if (localContainerRef.current) {
                                            localContainerRef.current.innerHTML =
                                                "";
                                            track.play(
                                                localContainerRef.current
                                            );
                                        }
                                        await client.publish([track]);
                                        setInfoMsg("");
                                        return true;
                                    } catch (inner) {
                                        console.warn(
                                            `Camera device failed (${d.label})`,
                                            {
                                                name: inner?.name,
                                                message: inner?.message,
                                            }
                                        );
                                    }
                                }
                            } catch (enumErr) {
                                console.warn(
                                    "Enumerate cameras failed",
                                    enumErr
                                );
                            }
                            const n = err?.name || "UnknownError";
                            let msg =
                                "Could not access camera. Check permissions and device.";
                            if (
                                n === "NotReadableError" ||
                                n === "TrackStartError"
                            ) {
                                msg =
                                    "Camera is likely in use by another app (Zoom/Teams/OBS). Close it and try again.";
                            } else if (n === "OverconstrainedError") {
                                msg =
                                    "The selected camera settings aren't supported. Try a different camera.";
                            } else if (
                                n === "NotAllowedError" ||
                                n === "SecurityError"
                            ) {
                                msg =
                                    "Camera permission denied or blocked. Check browser site permissions and Windows privacy settings.";
                            } else if (
                                typeof window !== "undefined" &&
                                !window.isSecureContext
                            ) {
                                msg =
                                    "Use https or localhost to access the camera.";
                            }
                            setCamOn(false);
                            setInfoMsg(msg);
                            return false;
                        }
                    };
                    await tryEnable();
                } else if (localVideoTrackRef.current) {
                    await localVideoTrackRef.current.setEnabled(true);
                }
            } else if (localVideoTrackRef.current) {
                // Turning camera OFF
                await localVideoTrackRef.current.setEnabled(false);
            }
        } catch {}
    };

    const resumeRemoteAudio = async () => {
        // Called on user gesture (button click) to replay any blocked remote audio
        const tracks = Array.from(blockedAudioTracksRef.current);
        blockedAudioTracksRef.current.clear();
        for (const t of tracks) {
            try {
                await t.play();
            } catch (e) {
                console.warn("Retry remote audio play failed", e?.message || e);
                // keep it for another try
                blockedAudioTracksRef.current.add(t);
            }
        }
        if (blockedAudioTracksRef.current.size === 0) setAudioBlocked(false);
    };

    return (
        <div style={{ padding: 8, width: 600, maxWidth: "90vw" }}>
            {status === "idle" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge video">Video Call</div>
                        <div className="cm-avatar">
                            {otherUser?.avatar ? (
                                <img src={otherUser.avatar} alt="avatar" />
                            ) : (
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21a8 8 0 0 0-16 0" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="cm-title">
                            Call{" "}
                            {otherUser?.fullname ||
                                otherUser?.username ||
                                "User"}
                        </div>
                        <div className="cm-subtitle">
                            <span className={`cm-status-dot cm-online`}></span>
                            {"Online"}
                        </div>
                    </div>
                    <div className="cm-divider" />
                    <div className="cm-actions">
                        <button className="cm-btn cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="cm-btn primary"
                            onClick={startCall}
                            disabled={
                                otherUser?.isOnline === false || isStarting
                            }
                            title={
                                otherUser?.isOnline === false
                                    ? "User is offline"
                                    : isStarting
                                    ? "Starting..."
                                    : "Call"
                            }
                        >
                            <VideoIcon size={18} /> Call
                        </button>
                    </div>
                </div>
            )}
            {status === "calling" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-avatar">
                            {otherUser?.avatar ? (
                                <img src={otherUser.avatar} alt="avatar" />
                            ) : (
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21a8 8 0 0 0-16 0" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div
                            className="cm-title lg"
                            style={{ textTransform: "capitalize" }}
                        >
                            {otherUser?.fullname ||
                                otherUser?.username ||
                                "User"}
                        </div>
                        <div className="cm-type">
                            <span className="cm-pill video">
                                {/* video glyph */}
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M17 10.5V7a2 2 0 0 0-2-2H3A2 2 0 0 0 1 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l6 4.5V6l-6 4.5z" />
                                </svg>
                            </span>
                            Video Call
                        </div>
                        <div className="cm-note" style={{ marginTop: 8 }}>
                            Calling…
                        </div>
                        <div className="cm-note">Waiting for acceptance…</div>
                    </div>
                    <div className="cm-divider" />
                    <div className="cm-actions one">
                        <button
                            className="cm-btn danger"
                            onClick={async () => {
                                try {
                                    await axios.post(`${API_BASE}/call/end`, {
                                        callId,
                                    });
                                } catch {}
                                setStatus("idle");
                                if (onClose) onClose();
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                style={{ marginRight: 8 }}
                            >
                                <path d="M21 16.5l-5.2-1.3a1 1 0 0 0-1 .27l-2.3 2.3a16 16 0 0 1-7.3-7.3l2.3-2.3a1 1 0 0 0 .27-1L7.5 1A1 1 0 0 0 6.5 0H3a1 1 0 0 0-1 1C2 13.15 10.85 22 22 22a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z" />
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {status === "ringing" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge video">Video Call</div>
                        <div className="cm-avatar">
                            {otherUser?.avatar ? (
                                <img src={otherUser.avatar} alt="avatar" />
                            ) : (
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21a8 8 0 0 0-16 0" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="cm-title" style={{ fontSize: "12px" }}>
                            Incoming call
                        </div>
                        <div className="cm-name">
                            {otherUser?.fullname ||
                                otherUser?.username ||
                                "User"}
                        </div>
                        <div className="cm-subtitle">
                            <span
                                className={`cm-status-dot ${
                                    otherUser?.isOnline
                                        ? "cm-online"
                                        : "cm-offline"
                                }`}
                            ></span>
                            {otherUser?.isOnline ? "Online" : "Offline"}
                        </div>
                    </div>
                    <div className="cm-divider" />
                    <div className="cm-actions">
                        <button
                            className="cm-btn cancel"
                            onClick={declineIncoming}
                        >
                            Decline
                        </button>
                        <button
                            className="cm-btn primary"
                            onClick={acceptIncoming}
                        >
                            <Phone size={18} /> Accept
                        </button>
                    </div>
                </div>
            )}
            {status === "declined" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge video">Video Call</div>
                        <div className="cm-avatar">
                            {otherUser?.avatar ? (
                                <img src={otherUser.avatar} alt="avatar" />
                            ) : (
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21a8 8 0 0 0-16 0" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="cm-title">
                            {otherUser?.fullname ||
                                otherUser?.username ||
                                "User"}
                        </div>
                        <div className="cm-note" style={{ marginTop: 8 }}>
                            Call declined
                        </div>
                        <div className="cm-subtitle">
                            They are unavailable right now
                        </div>
                    </div>
                    <div className="cm-divider" />
                    <div className="cm-actions one">
                        <button className="cm-btn" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            )}
            {inCall && rtc && (
                <div style={{ height: 480 }}>
                    <div
                        style={{
                            marginBottom: 8,
                            display: "flex",
                            gap: 8,
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={toggleMic}
                                title={micOn ? "Mute" : "Unmute"}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 999,
                                    background: "#2d2d2d",
                                    color: "white",
                                    border: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {micOn ? (
                                    <Mic size={18} />
                                ) : (
                                    <MicOff size={18} />
                                )}
                            </button>
                            <button
                                onClick={toggleCam}
                                title={
                                    camOn ? "Turn camera off" : "Turn camera on"
                                }
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 999,
                                    background: "#2d2d2d",
                                    color: "white",
                                    border: 0,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {camOn ? (
                                    <VideoIcon size={18} />
                                ) : (
                                    <VideoOff size={18} />
                                )}
                            </button>
                        </div>
                        <div
                            style={{
                                fontVariantNumeric: "tabular-nums",
                                color: "#ddd",
                            }}
                        >
                            {Math.floor(timeLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                            :{(timeLeft % 60).toString().padStart(2, "0")}
                        </div>
                        {endButton}
                    </div>
                    <div style={{ display: "flex", gap: 8, height: 420 }}>
                        <div
                            ref={localContainerRef}
                            style={{ flex: 1, background: "#111" }}
                        />
                        <div
                            ref={remoteContainerRef}
                            style={{ flex: 1, background: "#000" }}
                        />
                    </div>
                    {infoMsg && (
                        <div
                            style={{
                                marginTop: 8,
                                background: "#1e293b",
                                color: "#cbd5e1",
                                padding: 10,
                                borderRadius: 8,
                            }}
                        >
                            {infoMsg}
                        </div>
                    )}
                    {audioBlocked && (
                        <div
                            style={{
                                marginTop: 8,
                                background: "#222",
                                color: "#ffd24d",
                                padding: 10,
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                            }}
                        >
                            <span>
                                Your browser blocked auto-playing sound. Click
                                Enable to hear the other side.
                            </span>
                            <button
                                onClick={resumeRemoteAudio}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    background: "#4CAF50",
                                    color: "white",
                                    border: 0,
                                }}
                            >
                                Enable audio
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoCallBox;
