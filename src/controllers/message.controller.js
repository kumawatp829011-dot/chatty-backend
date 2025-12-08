// backend/src/controllers/message.controller.js
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Convert DB format → Frontend format
const formatMsg = (msg) => ({
  _id: msg._id,
  senderId: msg.sender,
  receiverId: msg.receiver,
  text: msg.message,
  image: msg.image || null,
  seen: msg.seen,
  isDeleted: msg.isDeleted || false,
  createdAt: msg.createdAt,
});

// 📨 SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    // frontend se agar "message" ya "text" jo bhi aaye, handle ho jaaye
    const { message, text } = req.body || {};
    const content = (message ?? text ?? "").trim();

    if (!content) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const msg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: content,
    });

    const formatted = formatMsg(msg);

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", formatted);
    }

    return res.status(201).json(formatted);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 💬 GET CHAT MESSAGES BETWEEN TWO USERS
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const chatUserId = req.params.id;

    const msgs = await Message.find({
      $or: [
        { sender: userId, receiver: chatUserId },
        { sender: chatUserId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(msgs.map(formatMsg));
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🧑 SIDEBAR USER LIST
export const getUsersForSidebar = async (req, res) => {
  try {
    const id = req.user._id;
    const users = await User.find({ _id: { $ne: id } }).select("-password");

    res.status(200).json(users);
  } catch (err) {
    console.error("getUsersSidebar error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 👁 MARK MESSAGE AS SEEN
export const markMessageAsSeen = async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { seen: true },
      { new: true }
    );

    const formatted = formatMsg(msg);
    io.emit("messageSeen", formatted);

    res.status(200).json(formatted);
  } catch (err) {
    console.error("markSeen error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ DELETE FOR EVERYONE
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const id = req.params.id;

    await Message.findByIdAndUpdate(id, {
      isDeleted: true,
      message: "",
      image: null,
    });

    io.emit("messageDeleted", { messageId: id });

    res.status(200).json({ message: "Deleted for everyone" });
  } catch (err) {
    console.error("deleteEveryone error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ DELETE ONLY FOR ME
export const deleteMessageForMe = async (req, res) => {
  try {
    // yahan tum agar future me "deletedFor" field add karna chaho
    // abhi ke liye sirf ok return kar rahe hain
    res.status(200).json({ id: req.params.id });
  } catch (err) {
    console.error("deleteForMe error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
