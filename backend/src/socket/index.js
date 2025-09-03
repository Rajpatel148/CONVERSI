import { Server } from "socket.io";
import { socketHandler } from "./socketHandler.js";

export const initServer = (server) => {
    let io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    //! use a auth middleware for socket connection 

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);
        socketHandler(io, socket);
    });
    return io;
};
