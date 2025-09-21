import { Router } from "express";
import {
    endCall,
    getToken,
    startCall,
} from "../controllers/call.controller.js";

const router = Router();

router.get("/token", getToken);
router.post("/start", startCall);
router.post("/end", endCall);

export default router;
