import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";

const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
};

const generateAccessRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Refresh tokens"
        );
    }
};

export const validate = asyncHandler(async (req, res) => {
    if (req.cookies.accessToken) {
        return res.status(200).json(new ApiResponse(200, {}, "Token exists"));
    }
    return res
        .status(401)
        .json(new ApiResponse(401, {}, "Token is not existed"));
});

export const signup = asyncHandler(async (req, res) => {
    //get data from frontend
    const { username, fullname, email, password, avatar } = req.body;

    //check data is not empty
    if (!fullname?.trim()) {
        throw new ApiError(400, "Full name is required");
    }

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    if (!email?.trim()) {
        throw new ApiError(400, "Email is required");
    }

    if (!password?.trim()) {
        throw new ApiError(400, "Password is required");
    }

    //check user is exists or not
    const existedUser = await User.exists({
        $and: [{ username }, { email }],
    }).select("-password -refreshToken");

    if (existedUser) {
        throw new ApiError(409, "User is already exists");
    }

    //create the user
    const user = await User.create({
        username,
        fullname,
        email,
        password,
        avatar,
        isOnline: true,
    });

    // store the user
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    const { accessToken, refreshToken } = await generateAccessRefreshTokens(
        user._id
    );
    if (!createdUser) {
        throw new ApiError(400, "Something went wrong while creating User ");
    }
    // return the respo
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: createdUser,
                    refreshToken,
                    accessToken,
                },
                "User register successfully"
            )
        );
});

export const login = asyncHandler(async (req, res) => {
    // get data from frontend
    const { username, email, password } = req.body;
    //valid data or not
    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }
    if (!email?.trim()) {
        throw new ApiError(400, "Email is required");
    }
    if (!password?.trim()) {
        throw new ApiError(400, "Password is required");
    }

    let userQuery = null;
    if (username && email) {
        userQuery = { username, email };
    } else if (email) {
        userQuery = { email };
    } else {
        userQuery = { username };
    }

    //find user and varify
    const user = await User.findOne(userQuery);

    if (!user) {
        throw new ApiError(404, "User not exist with this credential");
    }
    //compare password
    const isValid = await user.isPasswordCorrect(password);

    if (!isValid) {
        throw new ApiError(401, "Invalid Password");
    }
    //generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessRefreshTokens(
        user._id
    );
    //send cookie
    const loggedUser = await User.findByIdAndUpdate(
        user._id,
        {
            isOnline: true,
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");
    //send response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser,
                    refreshToken,
                    accessToken,
                },
                "User logged in successfully"
            )
        );
});

export const logOut = asyncHandler(async (req, res) => {
    //update the refresh token
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: "",
        },
    });
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiError(200, {}, "User Logged Out"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, username } = req.body;

    if (!fullname?.trim()) {
        throw new ApiError(400, "Full name is required");
    }

    const update = { fullname };

    if (typeof username === "string" && username.trim().length) {
        const uname = username.trim().toLowerCase();
        // basic format check: letters, numbers, underscore, 3-20 chars
        const re = /^[a-z0-9_]{3,20}$/;
        if (!re.test(uname)) {
            throw new ApiError(400, "Invalid username format");
        }
        // Ensure uniqueness excluding current user
        const exists = await User.findOne({
            _id: { $ne: req.user._id },
            username: uname,
        }).select("_id");
        if (exists) {
            throw new ApiError(409, "Username already taken");
        }
        update.username = uname;
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: update },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Account updated"));
});

export const changePassword = asyncHandler(async (req, res) => {
    //get oldpassword ,new password from frontend
    const { oldPassword, newPassword } = req.body;
    // valid they non-empty
    if (!oldPassword?.trim()) {
        throw new ApiError(400, "Oldpassword is require");
    }
    if (!newPassword?.trim()) {
        throw new ApiError(400, "New Password is require");
    }
    // ! check both passwords are diffrent
    // finnd the user of by id
    const user = await User.findById(req.user._id);

    // validate the oldpassword
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Password");
    }
    //if yes change the password and save into database
    user.password = newPassword;
    await user.save();
    //send response

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password is change successfully"));
});

export const changeAvatar = asyncHandler(async (req, res) => {
    //get url from frontend after uploading on clouinary
    const { avatar } = req.body;
    if (!avatar) {
        throw new ApiError(400, "Avatar url is require");
    }

    // find user by id
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(201, {}, "Avatar change successfully"));
});

// Delete own account and clean up related data (chats/messages)
export const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1) Delete all direct (1-1) chats the user is part of, and their messages
    const directChats = await Chat.find({
        isGroup: false,
        members: userId,
    }).select("_id");
    const directChatIds = directChats.map((c) => c._id);
    if (directChatIds.length) {
        await Message.deleteMany({ chatId: { $in: directChatIds } });
        await Chat.deleteMany({ _id: { $in: directChatIds } });
    }

    // 2) For group chats: remove the user from members and unreadCounts
    await Chat.updateMany(
        { isGroup: true, members: userId },
        { $pull: { members: userId, unreadCounts: { userId: userId } } }
    );

    // 3) For group chats where the user was admin: transfer admin or delete if empty/too small
    const groupsNeedingAdmin = await Chat.find({
        isGroup: true,
        groupAdmin: userId,
    }).select("_id");
    for (const { _id: gid } of groupsNeedingAdmin) {
        const fresh = await Chat.findById(gid);
        if (!fresh) continue;
        if (Array.isArray(fresh.members) && fresh.members.length > 0) {
            // Assign first remaining member as new admin
            fresh.groupAdmin = fresh.members[0];
            await fresh.save();
        } else {
            // No members left, delete chat and its messages
            await Message.deleteMany({ chatId: gid });
            await Chat.deleteOne({ _id: gid });
        }
    }

    // 4) Clean up any now-too-small groups (size < 2)
    const smallGroups = await Chat.find({
        isGroup: true,
        $expr: { $lt: [{ $size: "$members" }, 2] },
    }).select("_id");
    const smallGroupIds = smallGroups.map((g) => g._id);
    if (smallGroupIds.length) {
        await Message.deleteMany({ chatId: { $in: smallGroupIds } });
        await Chat.deleteMany({ _id: { $in: smallGroupIds } });
    }

    // 5) Remove all messages sent by this user across remaining chats
    await Message.deleteMany({ senderId: userId });

    // 6) Delete the user record
    await User.findByIdAndDelete(userId);

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Account deleted successfully"));
});
