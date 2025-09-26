import {
    deleteMessageHandler,
    sendMessageHandler,
} from "../controllers/message.controller.js";
import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";
import { User } from "../models/user.models.js";
// add message controller

export const socketHandler = async (io, socket) => {
    let currentUserId = null;

    // SEt up
    socket.on("setup", async (id) => {
        try {
            currentUserId = id;
            socket.join(id);
            const user = await User.findByIdAndUpdate(
                id,
                { isOnline: true },
                { new: true }
            ).select("-password -refreshToken");
            io.emit("user-online", id);
        } catch (error) {
            console.log(error);
        }
    });

    // Call signaling: invite -> accept/decline -> server relays to target user's personal room
    socket.on("call-invite", ({ to, from, callId, channel, kind }) => {
        if (!to || !from || !callId || !channel) return;
        io.to(String(to)).emit("call-invite", {
            to,
            from,
            callId,
            channel,
            kind,
        });
    });

    socket.on("call-accept", ({ to, from, callId, channel }) => {
        if (!to || !from || !callId || !channel) return;
        io.to(String(to)).emit("call-accept", { to, from, callId, channel });
    });

    socket.on("call-decline", ({ to, from, callId }) => {
        if (!to || !from || !callId) return;
        io.to(String(to)).emit("call-decline", { to, from, callId });
    });

    // Caller cancels before callee accepts -> notify callee to stop ringing UI
    socket.on("call-cancelled", ({ to, from, callId }) => {
        if (!to || !from || !callId) return;
        io.to(String(to)).emit("call-cancelled", { to, from, callId });
    });

    //Join the chat room
    socket.on("join-chat", async ({ roomId, userId }) => {
        try {
            const conv = await Chat.findById(roomId);
            if (!conv || !conv.members.some((m) => m.toString() === userId))
                return;
            socket.join(roomId);
            // Reset unread count for this user on server side for robustness
            if (Array.isArray(conv.unreadCounts)) {
                conv.unreadCounts = conv.unreadCounts.map((uc) => {
                    if (uc.userId.toString() === userId.toString())
                        uc.count = 0;
                    return uc;
                });
                await conv.save();
            }
            // Notify others in the room that user joined
            socket.to(roomId).emit("user-joined-room", userId);
        } catch (err) {
            console.log("join-chat error:", err);
        }
    });

    // Leave chat room
    socket.on("leave-chat", (room) => {
        // console.log("Leaved the chat",room)
        socket.leave(room);
    });

    // Send message
    socket.on("send-message", async (chatId) => {
        try {
            const latestMessage = await Message.findOne({ chatId })
                .sort({ createdAt: -1 })
                .populate("senderId");

            if (!latestMessage) return;

            io.to(chatId).emit("receive-message", latestMessage);

            // Notify others (outside room) with chat preview and counts
            const chat = await Chat.findById(chatId)
                .populate("members", "-password")
                .lean();
            if (chat) {
                const payload = {
                    chatId,
                    chat,
                    message: {
                        _id: latestMessage._id,
                        text: latestMessage.text,
                        imageUrl: latestMessage.imageUrl,
                        senderId: latestMessage.senderId,
                        createdAt: latestMessage.createdAt,
                    },
                };
                chat.members.forEach((member) => {
                    if (
                        member._id.toString() !==
                        latestMessage.senderId._id.toString()
                    ) {
                        io.to(member._id.toString()).emit(
                            "new-message-notification",
                            payload
                        );
                    }
                });
            }
        } catch (err) {
            console.log("send-message error:", err);
        }
    });

    const handleDeleteMessage = async (data) => {
        const { messageId, userIDS, chatId } = data;
        // Ensure initiator is included for persistence
        const userSet = new Set(
            (Array.isArray(userIDS) ? userIDS : [userIDS]).map(String)
        );
        if (currentUserId) userSet.add(String(currentUserId));
        const normalized = Array.from(userSet);
        const deleted = await deleteMessageHandler({
            messageId,
            userIDS: normalized,
        });
        if (!deleted) return;
        if (normalized.length > 1) {
            // delete for everyone -> broadcast to room
            io.to(chatId).emit("message-deleted", { messageId, chatId });
            // also ensure the initiating user receives it even if not in room
            if (currentUserId) {
                io.to(String(currentUserId)).emit("message-deleted", {
                    messageId,
                    chatId,
                });
            }
        } else if (normalized.length === 1) {
            // delete for me -> notify only that user so their UI removes locally
            const onlyUser = String(normalized[0]);
            io.to(onlyUser).emit("message-deleted", { messageId, chatId });
        }
    };

    // Delete the message
    socket.on("delete-message", handleDeleteMessage);

    // Typing indicator
    socket.on("typing", (data) => {
        io.to(data.chatId).emit("typing", data);
    });

    // Stop typing indicator
    socket.on("stop-typing", (data) => {
        io.to(data.chatId).emit("stop-typing", data);
    });

    // Disconnect like logout
    socket.on("logout", async (id) => {
        try {
            // Update user status
            const user = await User.findByIdAndUpdate(
                id,
                {
                    isOnline: false,
                    lastSeen: new Date(),
                },
                { new: true }
            );
            // ✅ Let everyone else know this user went offline
            // Emit to all connected clients
            io.emit("user-offline", id);

            // Optionally leave personal room
            socket.leave(id);
        } catch (err) {
            console.error("Logout handler error:", err);
        }
    });
};
