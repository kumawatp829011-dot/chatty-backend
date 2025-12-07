import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

// SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const newMessage = await Message.create({
      sender: req.user._id,
      receiver: req.params.id,
      message: req.body.message
    });

    const receiverSocketId = getReceiverSocketId(req.params.id);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Internal Error" });
  }
};

// GET CHAT MESSAGES
export const getMessages = async (req, res) => {
  const user = req.user._id;
  const chatUser = req.params.id;

  const messages = await Message.find({
    $or: [
      { sender: user, receiver: chatUser },
      { sender: chatUser, receiver: user }
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
};

// USER LIST
export const getUsersForSidebar = async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
  res.json(users);
};

// SEEN
export const markMessageAsSeen = async (req, res) => {
  const updated = await Message.findByIdAndUpdate(
    req.params.id,
    { seen: true },
    { new: true }
  );

  const senderSocket = getReceiverSocketId(updated.sender);
  if (senderSocket) io.to(senderSocket).emit("messageSeen", updated);

  res.json(updated);
};

// DELETE FOR ME
export const deleteMessageForMe = async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, {
    isDeleted: true,
    message: "",
  });
  res.json({ success: true });
};

// DELETE FOR EVERYONE
export const deleteMessageForEveryone = async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);

  io.emit("messageDeleted", { messageId: req.params.id });

  res.json({ success: true });
};
