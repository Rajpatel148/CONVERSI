import React, { useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useAuth } from "../../../context/Authcotext.jsx";
import axios from "axios";
import { Phone, PhoneOff } from "lucide-react";
import { ensureMicPermission } from "../../../utils/mediaPermissions";

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
    );
    const [peerId, setPeerId] = useState(payload?.from || null);
    const [callId, setCallId] = useState(payload?.callId || null);
    const [channel, setChannel] = useState(payload?.channel || null);
    const [timeLeft, setTimeLeft] = useState(10 * 60);
    // Use a numeric Agora UID (required when server token is generated with buildTokenWithUid)
    const [rtcUid] = useState(() => Math.floor(Math.random() * 2147483647) + 1);

    const clientRef = useRef(null);
    const localMicTrackRef = useRef(null);
    const blockedAudioTracksRef = useRef(new Set());
    const [audioBlocked, setAudioBlocked] = useState(false);

    const otherUser = useMemo(() => {
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
    }, [activeChatId, chatList, nonFriends, payload?.user, user?._id]);

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
        socket.on("call-accept", onAccept);

        const onDecline = ({ callId: cid }) => {
            if (callId && cid !== callId) return;
            setStatus("idle");
        };
        socket.on("call-decline", onDecline);

        return () => {
            socket.off("end-call", onEnd);
            socket.off("call-accept", onAccept);
            socket.off("call-decline", onDecline);
        };
    }, [socket, user?._id, otherUser?._id, callId]);

    useEffect(() => {
        if (!inCall) return;
        setTimeLeft(10 * 60);
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
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [inCall, callId]);

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
                        await tryPlayRemoteAudio(user.audioTrack);
                    }
                    // ignore remote video for voice call
                } catch (err) {
                    console.error("subscribe error", err);
                }
            });

            client.on("user-unpublished", () => {});

            await client.join(rtc.appId, rtc.channel, rtc.token, rtc.uid);

            try {
                const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
                localMicTrackRef.current = micTrack;
                await client.publish([micTrack]);
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

    const startCall = async () => {
        if (!otherUser?._id) return;
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
            if (onClose) onClose();
        });
    };

    const endButton = (
        <button
            onClick={async () => {
                try {
                    await axios.post(`${API_BASE}/call/end`, { callId });
                } catch {}
                endCallLocal();
            }}
            style={{
                padding: "8px 16px",
                backgroundColor: "#e53935",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                transition: "background-color 0.3s ease",
            }}
            onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#d32f2f")
            }
            onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#e53935")
            }
        >
            End Call
        </button>
    );

    return (
        <div style={{ padding: 16, width: 520, maxWidth: "90vw" }}>
            <h3 style={{ marginTop: 0 }}>Voice Call</h3>
            {status === "idle" && (
                <button
                    onClick={startCall}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "#4CAF50",
                        color: "white",
                        border: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <Phone size={18} />
                    Call {otherUser?.fullname || otherUser?.username || "User"}
                </button>
            )}

            {status === "calling" && (
                <div style={{ lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600 }}>
                        Calling {otherUser?.fullname || otherUser?.username}…
                    </div>
                    <div style={{ color: "#888" }}>Waiting for acceptance…</div>
                </div>
            )}

            {status === "ringing" && (
                <div style={{ display: "flex", gap: 12 }}>
                    <button
                        onClick={acceptIncoming}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "#4CAF50",
                            color: "white",
                            border: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <Phone size={18} /> Accept
                    </button>
                    <button
                        onClick={() => {
                            if (peerId) {
                                socket.emit("call-decline", {
                                    to: peerId,
                                    from: user._id,
                                    callId,
                                });
                            }
                            setStatus("idle");
                        }}
                        style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "#e74c3c",
                            color: "white",
                            border: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <PhoneOff size={18} /> Decline
                    </button>
                </div>
            )}

            {inCall && rtc && (
                <div>
                    <div
                        style={{
                            marginBottom: 8,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div />
                        <div style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Math.floor(timeLeft / 60)
                                .toString()
                                .padStart(2, "0")}
                            :{(timeLeft % 60).toString().padStart(2, "0")}
                        </div>
                        {endButton}
                    </div>
                    <p style={{ color: "#777" }}>Audio connected</p>
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

export default VoiceCallBox;
