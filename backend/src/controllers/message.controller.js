import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sendMessage = asyncHandler(async (req, res) => {
    //get deta from frontend
    const { chatId, senderId, text, imageUrl } = req.body;
    // validate the data
    if (!chatId || !senderId || !(text || imageUrl)) {
        throw new ApiError(404, "Invalid data to send message");
    }
    //find the chat
    const chat = await Chat.findById(chatId).populate("members", "-password");
    //save the message
    const newMessage = await Message.create({
        senderId,
        chatId,
        text,
        imageUrl,
        seenBy: [{ user: senderId }],
    });

    if (!newMessage) {
        throw new ApiError(400, "Something wen wrong while sending message");
    }

    await newMessage.save();
    // Update latest message preview
    chat.latestMsg = text ? text : "New image";
    chat.updatedAt = new Date();

    // Ensure unreadCounts exists for all members and increment for everyone except sender
    const senderStr = senderId.toString();
    const memberIds = chat.members.map((m) => m._id.toString());
    // Initialize unreadCounts if missing
    if (!Array.isArray(chat.unreadCounts)) chat.unreadCounts = [];
    // Build a map for quick access
    const ucMap = new Map(
        chat.unreadCounts.map((uc) => [uc.userId.toString(), uc])
    );
    memberIds.forEach((mid) => {
        // ensure entry exists
        if (!ucMap.has(mid)) {
            const entry = { userId: mid, count: 0 };
            chat.unreadCounts.push(entry);
            ucMap.set(mid, entry);
        }
        // increment for non-sender
        if (mid !== senderStr) {
            const entry = ucMap.get(mid);
            entry.count = (entry.count || 0) + 1;
        }
    });

    await chat.save();

    return res
        .status(200)
        .json(new ApiResponse(200, newMessage, "Message send successfully"));
});

export const getAllMessage = asyncHandler(async (req, res) => {
    //get chat data with sorted form
    const messages = await Message.find({
        chatId: req.params.chatId,
        deletedFrom: {
            $ne: req.user._id,
        },
    }).sort({ createdAt: 1 });

    if (!messages) {
        throw new ApiError(400, "ALL Messages not found");
    }
    // Mark seen to all messages that are not seen by req.user._id
    for (const message of messages) {
        const alreadySeen = message.seenBy.some(
            (entry) => entry.user.toString() === req.user._id.toString()
        );

        if (!alreadySeen) {
            message.seenBy.push({ user: req.user._id });
            await message.save();
        }
    }

    // Reset unread count in Chat for this user for this conversation
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (chat && Array.isArray(chat.unreadCounts)) {
            chat.unreadCounts = chat.unreadCounts.map((uc) => {
                if (uc.userId.toString() === req.user._id.toString()) {
                    uc.count = 0;
                }
                return uc;
            });
            await chat.save();
        }
    } catch (e) {
        // non-fatal
        console.log("Failed to reset unread count:", e?.message);
    }

    //return all messages
    return res
        .status(200)
        .json(new ApiResponse(200, messages, "Chat fetched successfully"));
});

export const deleteMessage = asyncHandler(async (req, res) => {
    //get data from frontend
    const msgID = req.body.messageId;
    const userIDS = req.body.userIds;

    if (!msgID || !userIDS) {
        throw new ApiError(400, "Invalid Deletion request");
    }
    //add userids which is deletethe message
    const message = await Message.findById(msgID);

    userIDS.forEach((userid) => {
        if (!message.deletedFrom.includes(userid)) {
            message.deletedFrom.push(userid);
        }
    });

    await message.save();
    //send response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Message Deleted successfully"));
});

export const sendMessageHandler = async (data) => {
    try {
        const { text, imageUrl, senderId, chatId } = data;

        const newMsg = await Message.create({
            chatId,
            senderId,
            text,
            imageUrl,
            seenBy: [],
        }).populate("senderId");

        return newMsg;
    } catch (error) {
        console.log("sendMessageHandler error:", error);
    }
};

export const deleteMessageHandler = async (data) => {
    try {
        const { messageId, userIDS } = data;
        const message = await Message.findById(messageId);

        if (!message) return false;

        userIDS.forEach((userId) => {
            if (!message.deletedFrom.includes(userId)) {
                message.deletedFrom.push(userId);
            }
        });

        await message.save();
        return true;
    } catch (error) {
        console.log(error);
    }
};
