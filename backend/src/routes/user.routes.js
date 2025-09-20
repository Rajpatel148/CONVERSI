import { Router } from "express";
import {
    changeAvatar,
    changePassword,
    login,
    logOut,
    signup,
    updateAccountDetails,
    validate,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/validate").get(validate);
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/logout").post(verifyJWT, logOut);
router.route("/update-account").post(verifyJWT, updateAccountDetails);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/change-avatar").post(verifyJWT, changeAvatar);

export default router;
