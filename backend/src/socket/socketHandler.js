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

    //Join the chat room
    socket.on("join-chat", async ({ roomId, userId }) => {
        // validate user is a member of conversation:
        const conv = await Chat.findById(roomId);
        if (!conv || !conv.members.some(m=>m.toString()===userId)) return;
        socket.join(roomId);
        // reset unread and emit user-joined-room
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

            // Optional: notify others
            const chat = await Chat.findById(chatId).populate("members");
            chat.members.forEach((member) => {
                if (
                    member._id.toString() !==
                    latestMessage.senderId._id.toString()
                ) {
                    io.to(member._id.toString()).emit(
                        "new-message-notification",
                        latestMessage
                    );
                }
            });
        } catch (err) {
            console.log("send-message error:", err);
        }
    });

    const handleDeleteMessage = async (data) => {
        const { messageId, userIDS, chatId } = data;
        const deleted = await deleteMessageHandler({ messageId, userIDS });
        if (deleted && userIDS.length > 1) {
            io.to(chatId).emit("message-deleted", data);
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
