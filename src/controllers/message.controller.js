import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// 📩 Send Message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject()
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("sendMessage error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 💬 Get Messages
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const chatUserId = req.params.id;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: chatUserId },
        { senderId: chatUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("getMessages error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🧑 Users List for Sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.log("getUsersSidebar error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 👁 Mark message as seen
export const markMessageAsSeen = async (req, res) => {
  try {
    const messageId = req.params.id;

    const updated = await Message.findByIdAndUpdate(
      messageId,
      { seen: true },
      { new: true }
    );

    const receiverSocketId = getReceiverSocketId(updated.senderId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageSeen", updated);
    }

    res.status(200).json(updated);
  } catch (error) {
    console.log("seen error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ Delete for Me
export const deleteMessageForMe = async (req, res) => {
  try {
    const messageId = req.params.id;
    await Message.findByIdAndUpdate(messageId, {
      isDeleted: true
    });
    res.status(200).json({ message: "Deleted for you" });
  } catch (error) {
    console.log("deleteForMe error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ Delete for Everyone (Realtime)
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const messageId = req.params.id;

    await Message.findByIdAndUpdate(messageId, {
      isDeleted: true,
      text: ""
    });

    io.emit("messageDeleted", { messageId });

    res.status(200).json({ message: "Deleted for everyone" });
  } catch (error) {
    console.log("delete everyone error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
