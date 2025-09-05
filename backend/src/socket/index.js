import { Server } from "socket.io";
import { socketHandler } from "./socketHandler.js";
import "dotenv/config";
export const initServer = (server) => {
    let io = new Server(server, {
        cors: {
            origin: `${process.env.FRONTEND_URL}`,
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true,
        },
    });

    //! use a auth middleware for socket connection

    io.on("connection", (socket) => {
        socketHandler(io, socket);
    });
    return io;
};
