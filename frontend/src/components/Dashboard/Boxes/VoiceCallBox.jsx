import React, { useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC from "../../../lib/agora";
import { useAuth } from "../../../context/Authcotext.jsx";
import axios from "axios";
import { Phone } from "lucide-react";
import { ensureMicPermission } from "../../../utils/mediaPermissions";
import "./CallModal.css";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_BACKEND_API_URL;
const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

// Simple id generator without external deps
const genId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const VoiceCallBox = ({ payload = {}, onClose }) => {
    const { user, socket, activeChatId, chatList, nonFriends } = useAuth();
    const [inCall, setInCall] = useState(false);
    const [rtc, setRtc] = useState(null); // { appId, token, channel, uid }
    const [status, setStatus] = useState(
        payload?.incoming ? "ringing" : "idle"
    ); // idle | calling | ringing | connected | declined
    const [peerId, setPeerId] = useState(payload?.from || null);
    const [callId, setCallId] = useState(payload?.callId || null);
    const [channel, setChannel] = useState(payload?.channel || null);
    const [timeLeft, setTimeLeft] = useState(10 * 60);
    const oneMinuteWarnedRef = useRef(false);
    // Use a numeric Agora UID (required when server token is generated with buildTokenWithUid)
    const [rtcUid] = useState(() => Math.floor(Math.random() * 2147483647) + 1);

    const clientRef = useRef(null);
    const localMicTrackRef = useRef(null);
    const remoteAudioTracksRef = useRef(new Set());
    const blockedAudioTracksRef = useRef(new Set());
    const [audioBlocked, setAudioBlocked] = useState(false);
    const [micMuted, setMicMuted] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(true);
    const speakerOnRef = useRef(true);
    useEffect(() => {
        speakerOnRef.current = speakerOn;
    }, [speakerOn]);

    const otherUser = useMemo(() => {
        // Helper to find a user object by id from chatList or nonFriends
        const findById = (id) => {
            if (!id) return null;
            for (const c of chatList || []) {
                if (Array.isArray(c?.members)) {
                    const u = c.members.find((m) => m?._id === id);
                    if (u) return u;
                }
            }
            const nf = Array.isArray(nonFriends)
                ? nonFriends.find((n) => n._id === id)
                : null;
            if (nf) return nf;
            return null;
        };

        // If this is an incoming call, prefer the caller id from payload
        const incomingUser = payload?.incoming ? findById(payload?.from) : null;
        if (incomingUser) return incomingUser;

        // Otherwise use the selected chat context
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
        const onEnd = (data) => {
            if (!callId || data?.callId !== callId) return;
            endCallLocal();
        };
        socket.on("end-call", onEnd);

        const onAccept = async ({ callId: cid, channel: ch }) => {
            // Match on callId to avoid mismatch when UI context differs
            if (callId && cid !== callId) return;
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

        const onDecline = ({ callId: cid }) => {
            if (callId && cid !== callId) return;
            // Show a brief declined UI to the caller
            setStatus("declined");
        };

        socket.on("call-accept", onAccept);
        socket.on("call-decline", onDecline);

        return () => {
            socket.off("end-call", onEnd);
            socket.off("call-accept", onAccept);
            socket.off("call-decline", onDecline);
        };
    }, [socket, user?._id, otherUser?._id, callId, rtcUid]);

    // If the callee goes offline while we're calling/ringing, cancel and close.
    useEffect(() => {
        if (!socket || !otherUser?._id) return;
        const handleOffline = (id) => {
            if (id !== otherUser._id) return;
            if (status === "calling" || status === "ringing") {
                const name =
                    otherUser?.fullname || otherUser?.username || "User";
                toast.error(`${name} is offline. Call cancelled.`);
                setStatus("idle");
                onClose && onClose();
            }
        };
        socket.on("user-offline", handleOffline);
        return () => socket.off("user-offline", handleOffline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, otherUser?._id, status]);

    // Auto-close overlay a moment after showing declined (caller side)
    useEffect(() => {
        if (status !== "declined") return;
        const t = setTimeout(() => {
            setStatus("idle");
            onClose && onClose();
        }, 5000);
        return () => clearTimeout(t);
    }, [status, onClose]);

    useEffect(() => {
        if (!inCall) return;
        setTimeLeft(10 * 60);
        oneMinuteWarnedRef.current = false;
        const t = setInterval(() => {
            setTimeLeft((s) => {
                if (s <= 1) {
                    clearInterval(t);
                    axios
                        .post(`${API_BASE}/call/end`, { callId })
                        .catch(() => {});
                    endCallLocal();
                    return 0;
                }
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

    // Show connected warning
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

    // Join/leave for audio-only
    useEffect(() => {
        const join = async () => {
            if (!inCall || !rtc) return;
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            clientRef.current = client;

            const tryPlayRemoteAudio = async (audioTrack) => {
                try {
                    await audioTrack.play();
                    return true;
                } catch (e) {
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
                    if (mediaType === "audio" && user.audioTrack) {
                        // remember remote audio track for volume control
                        remoteAudioTracksRef.current.add(user.audioTrack);
                        // apply current speaker state
                        try {
                            user.audioTrack.setVolume(
                                speakerOnRef.current ? 100 : 0
                            );
                        } catch {}
                        await tryPlayRemoteAudio(user.audioTrack);
                    }
                    // ignore remote video for voice call
                } catch (err) {
                    console.error("subscribe error", err);
                }
            });

            client.on("user-unpublished", (user, mediaType) => {
                if (mediaType === "audio" && user?.audioTrack) {
                    remoteAudioTracksRef.current.delete(user.audioTrack);
                }
            });

            await client.join(rtc.appId, rtc.channel, rtc.token, rtc.uid);

            try {
                const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
                localMicTrackRef.current = micTrack;
                await client.publish([micTrack]);
                setMicMuted(false);
            } catch (err) {
                console.error("Failed to create/publish mic track", err);
                alert(
                    "Microphone permission is required to continue the voice call. Please allow access and try again."
                );
                try {
                    if (callId) {
                        await axios.post(`${API_BASE}/call/end`, { callId });
                    }
                } catch {}
                endCallLocal();
                return;
            }
        };

        const leave = async () => {
            try {
                if (localMicTrackRef.current) {
                    localMicTrackRef.current.stop();
                    localMicTrackRef.current.close();
                }
                if (clientRef.current) {
                    await clientRef.current.leave();
                    clientRef.current.removeAllListeners();
                }
            } catch {}
        };

        if (inCall && rtc) join();
        return () => {
            if (!inCall) leave();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inCall, rtc?.appId, rtc?.channel, rtc?.token, rtc?.uid]);

    const resumeRemoteAudio = async () => {
        const tracks = Array.from(blockedAudioTracksRef.current);
        blockedAudioTracksRef.current.clear();
        for (const t of tracks) {
            try {
                await t.play();
            } catch (e) {
                console.warn("Retry remote audio play failed", e?.message || e);
                blockedAudioTracksRef.current.add(t);
            }
        }
        if (blockedAudioTracksRef.current.size === 0) setAudioBlocked(false);
    };

    const toggleMic = async () => {
        const track = localMicTrackRef.current;
        if (!track) return;
        const nextMuted = !micMuted;
        try {
            await track.setEnabled(!nextMuted);
            setMicMuted(nextMuted);
        } catch {}
    };

    const toggleSpeaker = () => {
        const next = !speakerOn;
        setSpeakerOn(next);
        const tracks = Array.from(remoteAudioTracksRef.current);
        for (const t of tracks) {
            try {
                t.setVolume(next ? 100 : 0);
            } catch {}
        }
    };

    const startCall = async () => {
        if (!otherUser?._id) return;
        if (otherUser?.isOnline === false) {
            const name = otherUser?.fullname || otherUser?.username || "User";
            toast.error(
                `${name} is offline. You can't place a call right now.`
            );
            onClose && onClose();
            return;
        }
        // Preflight mic permission so publish won't fail later
        const perm = await ensureMicPermission();
        if (!perm.ok) {
            alert(
                perm.error ||
                    "Microphone permission is required to start a voice call."
            );
            return;
        }
        const cid = genId();
        const ch = `call_${cid}`;
        setCallId(cid);
        setChannel(ch);
        setPeerId(otherUser._id);
        setStatus("calling");
        socket.emit("call-invite", {
            to: otherUser._id,
            from: user._id,
            callId: cid,
            channel: ch,
            kind: "audio",
        });
    };

    const acceptIncoming = async () => {
        if (!channel) return;
        // Preflight mic permission for callee
        const perm = await ensureMicPermission();
        if (!perm.ok) {
            alert(
                perm.error ||
                    "Microphone permission is required to join the call."
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

    const endCallLocal = () => {
        const leave = async () => {
            try {
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
        leave().finally(() => {
            setInCall(false);
            setRtc(null);
            setStatus("idle");
            // reset controls and tracked audio
            remoteAudioTracksRef.current.clear();
            blockedAudioTracksRef.current.clear();
            setAudioBlocked(false);
            setMicMuted(false);
            setSpeakerOn(true);
            if (onClose) onClose();
        });
    };

    // If this component unmounts while the receiver is ringing (incoming), auto-decline to notify caller
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

    return (
        <div style={{ padding: 8, width: 520, maxWidth: "90vw" }}>
            {status === "idle" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge voice">Voice Call</div>
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
                            disabled={otherUser?.isOnline === false}
                            title={
                                otherUser?.isOnline === false
                                    ? "User is offline"
                                    : "Call"
                            }
                        >
                            <Phone size={18} /> Call
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
                            <span className="cm-pill voice">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M6.62 10.79a15.91 15.91 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V21a1 1 0 0 1-1 1C10.85 22 2 13.15 2 2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.19 2.46.57 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2z" />
                                </svg>
                            </span>
                            Voice Call
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
                            onClick={() => {
                                // Cancel outgoing invite
                                try {
                                    axios
                                        .post(`${API_BASE}/call/end`, {
                                            callId,
                                        })
                                        .catch(() => {});
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

            {status === "declined" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge voice">Voice Call</div>
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

            {status === "ringing" && (
                <div className="call-modal">
                    <div className="cm-header">
                        <div className="cm-badge voice">Voice Call</div>
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
                            onClick={() => {
                                if (peerId) {
                                    socket.emit("call-decline", {
                                        to: peerId,
                                        from: user._id,
                                        callId,
                                    });
                                }
                                setStatus("idle");
                                onClose && onClose();
                            }}
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

            {inCall && rtc && (
                <div className="call-connected">
                    <div className="cc-top">
                        <div className="cc-left">
                            <div className="cc-tag">Voice Call</div>
                            <div className="cc-name">
                                {otherUser?.fullname ||
                                    otherUser?.username ||
                                    "User"}
                            </div>
                            <div className="cc-status">Connected</div>
                        </div>
                        <div className="cc-timer">
                            {Math.floor(timeLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                            :{(timeLeft % 60).toString().padStart(2, "0")}
                        </div>
                    </div>

                    <div className="cc-actions">
                        {/* Mic toggle */}
                        <button
                            className={`cc-icon ${micMuted ? "active" : ""}`}
                            onClick={toggleMic}
                            title={micMuted ? "Unmute mic" : "Mute mic"}
                        >
                            {micMuted ? (
                                // mic off icon
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                                    <path d="M15 9V4a3 3 0 0 0-6 0v1" />
                                    <path d="M5 10a7 7 0 0 0 12.83 3" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                // mic on icon
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10a7 7 0 0 1-14 0" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            )}
                        </button>

                        {/* Speaker toggle */}
                        <button
                            className={`cc-icon ${!speakerOn ? "active" : ""}`}
                            onClick={toggleSpeaker}
                            title={
                                speakerOn ? "Mute speaker" : "Unmute speaker"
                            }
                        >
                            {speakerOn ? (
                                // speaker on
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            ) : (
                                // speaker off
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" />
                                    <line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            )}
                        </button>
                        <div className="cc-spacer" />
                        <button
                            className="cc-btn cc-end"
                            onClick={async () => {
                                try {
                                    await axios.post(`${API_BASE}/call/end`, {
                                        callId,
                                    });
                                } catch {}
                                endCallLocal();
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M21 16.5l-5.2-1.3a1 1 0 0 0-1 .27l-2.3 2.3a16 16 0 0 1-7.3-7.3l2.3-2.3a1 1 0 0 0 .27-1L7.5 1A1 1 0 0 0 6.5 0H3a1 1 0 0 0-1 1C2 13.15 10.85 22 22 22a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z" />
                            </svg>
                            End Call
                        </button>
                    </div>

                    {audioBlocked && (
                        <div
                            style={{
                                marginTop: 10,
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
                                Auto-play audio was blocked. Click Enable to
                                hear the other side.
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

export default VoiceCallBox;
