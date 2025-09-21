// Simple helpers to preflight browser mic/camera permissions using getUserMedia
// Each function returns { ok: boolean, error?: string }

const stopStream = (stream) => {
    if (!stream) return;
    try {
        stream.getTracks().forEach((t) => t.stop());
    } catch {}
};

export async function ensureMicPermission() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return {
            ok: false,
            error: "MediaDevices API not available in this browser.",
        };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        stopStream(stream);
        return { ok: true };
    } catch (e) {
        let message = "Microphone permission denied.";
        if (e && e.message) message = e.message;
        return { ok: false, error: message };
    }
}

export async function ensureCamPermission() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return {
            ok: false,
            error: "MediaDevices API not available in this browser.",
        };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
        });
        stopStream(stream);
        return { ok: true };
    } catch (e) {
        let message = "Camera permission denied.";
        if (e && e.message) message = e.message;
        return { ok: false, error: message };
    }
}

export async function ensureAVPermission() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        return {
            ok: false,
            error: "MediaDevices API not available in this browser.",
        };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        stopStream(stream);
        return { ok: true };
    } catch (e) {
        let message = "Mic/Camera permission denied.";
        if (e && e.message) message = e.message;
        return { ok: false, error: message };
    }
}
