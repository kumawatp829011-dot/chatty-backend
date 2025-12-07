import { Server } from "socket.io";
import http from "http";
import express from "express";

export const app = express();
export const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chatty-frontend-lac.vercel.app"
    ],
    credentials: true,
  },
});

// Active users store
const userSocketMap = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("logout", () => {
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Broadcast delete to both users
  socket.on("messageDeleted", ({ messageId }) => {
    io.emit("messageDeleted", { messageId });
  });

  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

// helper for controllers
export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

export { io };
