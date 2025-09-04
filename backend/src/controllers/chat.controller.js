// create chat
// get userchat
// get chat list

import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.models.js";
import { User } from "../models/user.models.js";

export const createChat = asyncHandler(async (req, res) => {
    // get data from frontend
    const { members: memberIds, name } = req.body;
    console.log(memberIds);
    // validate the data
    if (!memberIds || memberIds?.length < 2) {
        throw new ApiError(400, "Invalid requrest !!");
    }
    if (memberIds?.length > 2 && !name) {
        throw new ApiError(400, "Group name is require ");
    }
    // Check if chat already exists
    let existedChat;
    if (memberIds.length === 2) {
        // 1-on-1 chat: ensure no group is mistakenly returned
        existedChat = await Chat.findOne({
            isGroup: false,
            members: { $all: memberIds, $size: 2 },
        }).populate("members", "-password");
    } else {
        // Group chat: optional logic for duplicate groups if needed
        existedChat = await Chat.findOne({
            isGroup: true,
            name: name,
        }).populate("members", "-password");
    }

    if (existedChat) {
        existedChat.members = existedChat.members.filter(
            (memberId) => memberId != req.user._id
        );

        return res
            .status(200)
            .json(
                new ApiResponse(200, existedChat, "Chat created successfully")
            );
    }
    // create new chat
    const chat = await Chat.create({
        members: memberIds,
        isGroup: memberIds.length > 2,
        groupAdmin: memberIds?.length > 2 ? req.user._id : undefined,
        name,
        unreadCounts: memberIds.map((memberId) => ({
            userId: memberId,
            count: 0,
        })),
    });
    await chat.populate("members", "-password");
    //remove current user

    chat.members = chat.members.filter((member) => member.id != req.user._id);
    //send response
    return res
        .status(200)
        .json(new ApiResponse(200, chat, "Chat created successfully"));
});

export const getChat = asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id).populate(
        "members",
        "-password"
    );

    if (!chat) {
        throw new ApiError(400, "Chat not found");
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, chat, "Chat fetched successfully"));
});

export const getChatList = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    // find the chats where user is memeber
    const chatList = await Chat.find({
        members: {
            $in: userId,
        },
    }).populate("members", "-password");

    if (!chatList) {
        throw new ApiError(400, "Chats not found");
    }
    //remove user from exited chats memberlist for better data sending
    chatList.forEach((chat) => {
        chat.members = chat.members.filter(
            (member) => member._id.toString() !== userId.toString()
        );
    });

    chatList.sort((a, b) => {
        return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    });
    // send data
    return res
        .status(200)
        .json(new ApiResponse(200, chatList, "ChatList fetched successfully"));
});

export const getNonFriendsList = asyncHandler(async (req, res) => {
    // Use correct user id field
    const chat = await Chat.find({
        members: { $in: [req.user._id] },
        isGroup: false,
    });
    //Get all member IDs from chats
    const memberIds = chat.length ? chat.flatMap((c) => c.members) : [];

    // Exclude current user and all chat members
    const users = await User.find({
        _id: { $nin: [...memberIds, req.user._id] },
    }).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, users, "Non-friend are fetched successfully")
        );
});
