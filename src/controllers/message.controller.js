// 📩 Send Message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text } = req.body; // <- changed here

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
    });

    // Send realtime message to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
