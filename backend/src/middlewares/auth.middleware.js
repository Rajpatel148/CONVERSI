import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const authHeader =
            req.headers.authorization || req.headers.Authorization;
        const bearerToken =
            authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null;

        const token = req.cookies?.accessToken || bearerToken;

        if (!token) {
            throw new ApiError(401, "Unauthorizaded User");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "don't verify JWT");
    }
});
