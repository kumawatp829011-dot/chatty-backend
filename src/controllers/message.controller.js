// backend/src/controllers/message.controller.js
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// 👥 Users list for sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 💬 Get conversation messages
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedFor: { $ne: myId }, // jis user ne delete for me kiya usko nahin dikhega
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 📩 Send message (with image support)
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      seen: false,
      isDeleted: false,
      deletedFor: [],
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 👁 Mark message as seen
export const markMessageAsSeen = async (req, res) => {
  try {
    const messageId = req.params.id;

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { seen: true },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const senderSocketId = getReceiverSocketId(
      updatedMessage.senderId.toString()
    );
    if (senderSocketId) {
      // pura updated message bhej rahe hain
      io.to(senderSocketId).emit("messageSeen", updatedMessage);
    }

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("Error in markMessageAsSeen controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🗑 Delete for me (sirf current user ke liye hide)
export const deleteMessageForMe = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in deleteMessageForMe controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🗑 Delete for everyone (real-time)
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // sirf sender hi delete for everyone kar sakta hai
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not allowed to delete this message for everyone",
      });
    }

    message.isDeleted = true;
    message.text = "";
    message.image = null;
    await message.save();

    const receiverSocketId = getReceiverSocketId(
      message.receiverId.toString()
    );
    const senderSocketId = getReceiverSocketId(message.senderId.toString());

    [receiverSocketId, senderSocketId].forEach((sid) => {
      if (sid) {
        io.to(sid).emit("messageDeleted", { messageId: message._id });
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in deleteMessageForEveryone controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
