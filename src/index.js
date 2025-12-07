import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./socket/socket.js"; // 👈 SINGLE SERVER USED

dotenv.config();
connectDB();

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

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
