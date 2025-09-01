import { Router } from "express";
import {
     deleteMessage,
    getAllMessage,
    sendMessage,
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);
// Routes
router.route("/send").post(sendMessage);
router.route("/c/:chatId").post(getAllMessage);
router.route("/delete").post(deleteMessage);

export default router;
