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
    chat.updatedAt = new Date();
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
