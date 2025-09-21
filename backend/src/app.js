import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
const app = express();

//! Middleware for upcoming data by many ways
app.use(express.json()); //data coming from json file or formate
app.use(express.urlencoded({ extended: true })); //data coming from URL
app.use(express.static("public"));
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
//!Routes
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/message.routes.js";
import chatRouter from "./routes/chat.routes.js";
import callRouter from "./routes/call.routes.js";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/call", callRouter);

export { app };
