import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

export const validate = asyncHandler(async (req,res)=>{
    if(req.cookies.accessToken){
        return res.status(200).json(new ApiResponse(200,{},"Token exists"));
    }
    return res.status(401).json(new ApiResponse(401,{},"Token is not existed"))
})

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
    //get data from frontend
    const { fullname } = req.body;
    //varify that data
    if (!fullname?.trim()) {
        throw new ApiError(400, "All fields are require");
    }

    //update the details
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            fullname,
        },
    }).select("-password -refreshToken");
    //send response
    return res.status(200).json(new ApiResponse(200, user, "Account updated")); //!here this information is got before the update of details
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
