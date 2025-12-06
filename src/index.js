// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import path from "path";

// import { connectDB } from "./lib/db.js";
// import authRoutes from "./routes/auth.route.js";
// import messageRoutes from "./routes/message.route.js";
// import { app, server } from "./lib/socket.js";

// const PORT = process.env.PORT;
// const __dirname = path.resolve();

// app.use(express.json());
// app.use(cookieParser());
// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "https://chatty-frontend-lac.vercel.app"
//   ],
//   credentials: true,
// }));

// app.use("/api/auth", authRoutes);
// app.use("/api/messages", messageRoutes);

// // if (process.env.NODE_ENV === "production") {
// //   app.use(express.static(path.join(__dirname, "../frontend/dist")));

// //   app.get("*", (req, res) => {
// //     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
// //   });
// // }

// server.listen(PORT, () => {
//   console.log("server is running on PORT:" + PORT);
//   connectDB();
// });


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./src/lib/db.js";
import authRoutes from "./src/routes/auth.route.js";
import messageRoutes from "./src/routes/message.route.js";

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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
