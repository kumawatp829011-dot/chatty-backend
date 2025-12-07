import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

// 📩 Send Message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message,
    });

    // Send realtime msg to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        message: newMessage,
        from: senderId,
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 💬 Get Messages
export const getMessages = async (req, res) => {
  const userId = req.user._id;
  const chatUserId = req.params.id;

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: chatUserId },
        { sender: chatUserId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🧑 Users List for Sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "-password"
    );

    res.status(200).json(users);
  } catch (error) {
    console.error("getUsersSidebar error:", error);
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

    res.status(200).json(updated);
  } catch (error) {
    console.error("seen error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ Delete for Me
export const deleteMessageForMe = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);

    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Soft delete: mark message hidden for that user
    if (msg.sender.toString() === userId.toString()) msg.senderDeleted = true;
    if (msg.receiver.toString() === userId.toString()) msg.receiverDeleted = true;

    await msg.save();

    res.status(200).json({ message: "Deleted for you" });
  } catch (error) {
    console.error("delete for me error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ❌ Delete for Everyone (Realtime)
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);

    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await msg.deleteOne();

    // Notify both users through socket
    const receiverSocketId = getReceiverSocketId(msg.receiver);
    const senderSocketId = getReceiverSocketId(msg.sender);

    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", messageId);
    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", messageId);

    res.status(200).json({ message: "Deleted for everyone", id: messageId });
  } catch (error) {
    console.error("delete everyone error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
