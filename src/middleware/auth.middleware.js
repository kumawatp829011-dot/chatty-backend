// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token =
      req.cookies.jwt ||
      req.headers.authorization?.split(" ")[1]; // mobile & axios support ✔

    if (!token) {
      console.log("❌ No token found");
      return res.status(401).json({ message: "Not authorized - no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.userId).select("-password");

    if (!req.user) {
      console.log("❌ User not found for token");
      return res.status(401).json({ message: "Not authorized - user missing" });
    }

    next();
  } catch (error) {
    console.error("🔴 protectRoute error:", error);
    return res.status(401).json({ message: "Token failed or expired" });
  }
};
