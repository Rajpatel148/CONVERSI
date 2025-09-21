import "dotenv/config";
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;
import { getIO } from "../socket/index.js";

// In-memory store; replace with Redis/DB for prod
const calls = new Map(); // callId -> { callerId, calleeId, channel, timer, startedAt }

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERT;

export const getToken = async (req, res) => {
    try {
        const channel = String(req.query.channel || "default");
        const uid = String(req.query.uid || "0");
        if (!APP_ID || !APP_CERT) {
            return res.status(500).json({ message: "Agora not configured" });
        }
        const expireSeconds = Number(process.env.AGORA_TOKEN_EXPIRE || 3600);
        const ts = Math.floor(Date.now() / 1000);
        const privilegeExpire = ts + expireSeconds;

        const rtcToken = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERT,
            channel,
            Number(uid),
            RtcRole.PUBLISHER,
            privilegeExpire
        );

        return res.json({ appId: APP_ID, rtcToken, channel, uid });
    } catch (err) {
        console.error("/call/token error:", err);
        return res.status(500).json({ message: "Failed to issue token" });
    }
};

export const startCall = async (req, res) => {
    try {
        const { callId, channel, callerId, calleeId } = req.body || {};
        if (!callId || !channel || !callerId || !calleeId) {
            return res.status(400).json({ message: "Missing fields" });
        }

        if (calls.has(callId)) {
            clearTimeout(calls.get(callId).timer);
        }

        const io = getIO();
        const limitMs = Number(
            process.env.CALL_TIME_LIMIT_MS || 10 * 60 * 1000
        );
        const timer = setTimeout(() => {
            try {
                io.to(String(callerId)).emit("end-call", {
                    callId,
                    reason: "time-limit",
                });
                io.to(String(calleeId)).emit("end-call", {
                    callId,
                    reason: "time-limit",
                });
            } catch (e) {
                console.error("emit end-call time-limit error", e);
            }
            calls.delete(callId);
        }, limitMs);

        calls.set(callId, {
            callerId,
            calleeId,
            channel,
            timer,
            startedAt: Date.now(),
        });
        return res.json({ ok: true, callId, willEndAt: Date.now() + limitMs });
    } catch (err) {
        console.error("/call/start error:", err);
        return res.status(500).json({ message: "Failed to start call" });
    }
};

export const endCall = async (req, res) => {
    try {
        const { callId } = req.body || {};
        if (!callId || !calls.has(callId)) {
            return res.status(400).json({ message: "Unknown call" });
        }
        const io = getIO();
        const call = calls.get(callId);
        clearTimeout(call.timer);
        try {
            io.to(String(call.callerId)).emit("end-call", {
                callId,
                reason: "manual",
            });
            io.to(String(call.calleeId)).emit("end-call", {
                callId,
                reason: "manual",
            });
        } catch (e) {
            console.error("emit end-call manual error", e);
        }
        calls.delete(callId);
        return res.json({ ok: true });
    } catch (err) {
        console.error("/call/end error:", err);
        return res.status(500).json({ message: "Failed to end call" });
    }
};
