import {
    deleteMessageHandler,
    sendMessageHandler,
} from "../controllers/message.controller.js";
import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";
import { User} from "../models/user.models.js"
// add message controller

export const socketHandler = async (io, socket) => {
    let currentUserId = null;

    // SEt up
    socket.on("setup", async (id) => {
        console.log("User id received",id)
        currentUserId = id;
        socket.join(id);
        console.log("User joins personal room", id);
        await User.findByIdAndUpdate(id, { isOnline: true });
        socket.emit("user setup", id);
    });

    //Join the chat room
    socket.on("join-chat", async ({ roomId, userId }) => {
        // validate user is a member of conversation:
        const conv = await Chat.findById(roomId);
        if (!conv || !conv.members.includes(userId)) return;
        socket.join(roomId);
        // reset unread and emit user-joined-room
    });

    // Leave chat room
    socket.on("leave-chat", (room) => {
        // console.log("Leaved the chat",room)
        socket.leave(room);
    });

    const handleSendMessage = async (data) => {
        const { chatId, senderId, text, imageUrl } = data;

        const chat = await Chat.findById(chatId).populate("members");

        const receiverId = chat.members.find(
            (member) => member._id != senderId
        )._id;

        const receiverPersonalRoom = io.sockets.adapter.rooms.get(
            receiverId.toString()
        );

        let isReceiverInsideChatRoom = false;

        if (receiverPersonalRoom) {
            const receiverSid = Array.from(receiverPersonalRoom)[0];
            isReceiverInsideChatRoom = io.sockets.adapter.rooms
                .get(chatId)
                .has(receiverSid);
        }

        const message = await sendMessageHandler({
            text,
            imageUrl,
            senderId,
            chatId,
            receiverId,
            isReceiverInsideChatRoom,
        });

        io.to(chatId).emit("receive-message", message);
        // sending notification to receiver
        if (!isReceiverInsideChatRoom) {
            console.log("Emitting new message to: ", receiverId.toString());
            io.to(receiverId.toString()).emit(
                "new-message-notification",
                message
            );
        }
    };

    // Send message
    socket.on("send-message", handleSendMessage);

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

    // Disconnect
    socket.on("disconnect", async () => {
        await User.findByIdAndUpdate(currentUserId, {
            isOnline: false,
            lastSeen: new Date(),
        });
        // notify conversation rooms
    });
};
