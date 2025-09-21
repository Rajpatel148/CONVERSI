import { Server } from "socket.io";
import { socketHandler } from "./socketHandler.js";
import "dotenv/config";

let ioInstance = null;

export const initServer = (server) => {
    let io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
        },
    });

    //! use a auth middleware for socket connection

    io.on("connection", (socket) => {
        socketHandler(io, socket);
    });
    ioInstance = io;
    return io;
};

export const getIO = () => {
    if (!ioInstance) throw new Error("Socket.io not initialized");
    return ioInstance;
};
