import { Server } from "socket.io";

export const initServer = (server) => {
  let io = new Server(server);
     
  io.on("connection", (socket) => {
    console.log(`New Connection`, socket.id);
  });
  return io;
};
