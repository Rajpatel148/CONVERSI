import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createChat,
    getChat,
    getChatList,
} from "../controllers/chat.controller.js";

const router = Router();

// Middlewares
router.use(verifyJWT);

// Routes
router.route("/create").post(createChat);
router.route("/list").get(getChatList);
router.route("/:id").get(getChat);
export default router;
