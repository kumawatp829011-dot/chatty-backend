import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://chatty-frontend-lac.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const PORT = process.env.PORT || 5050;

// 🟢 SOCKET.IO SETUP
const onlineUsers = new Set();
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chatty-frontend-lac.vercel.app"
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) return;

  onlineUsers.add(userId);
  io.emit("getOnlineUsers", [...onlineUsers]);

  console.log("User Connected:", userId);

  socket.on("logout", () => {
    onlineUsers.delete(userId);
    io.emit("getOnlineUsers", [...onlineUsers]);
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("getOnlineUsers", [...onlineUsers]);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
