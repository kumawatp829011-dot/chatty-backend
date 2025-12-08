import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import messageRoutes from "./routes/message.route.js";
import authRoutes from "./routes/auth.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", 1);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://chatty-frontend-lac.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Routes
app.use("/api/messages", messageRoutes);
app.use("/api/auth", authRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
    server.listen(process.env.PORT || 5000, () =>
        console.log(`🚀 Server running @ PORT ${process.env.PORT}`)
    );
})
.catch((err) => console.log("MongoDB Error:", err));
