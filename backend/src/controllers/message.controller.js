import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';
import { getReceiverSocketId, io } from '../lib/socket.js';

// Get users for the sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a specific chat
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a message to a specific user
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

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Emit the message to the receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark messages as read for a specific chat
export const markMessagesAsRead = async (req, res) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  try {
    // Mark unread messages as read
    const result = await Message.updateMany(
      {
        senderId: userToChatId,
        receiverId: myId,
        readBy: { $ne: myId }, // Ensure we only mark unread messages
      },
      { $push: { readBy: myId } } // Add current user to `readBy` array
    );

    // If no messages were updated, notify the user
    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: false, message: "No new messages to mark as read." });
    }

    res.status(200).json({ success: true, message: "Messages marked as read." });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get unread message counts for the logged-in user
export const getUnreadCounts = async (req, res) => {
  const userId = req.user._id;

  try {
    // Aggregate unread messages grouped by chatId
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          readBy: { $ne: userId }, // Not read by current user
          receiverId: userId,      // Messages sent to current user
        },
      },
      {
        $group: {
          _id: "$chatId", // Group by chatId
          count: { $sum: 1 } // Count unread messages for each chat
        }
      }
    ]);

    // Convert the aggregated result into a clean object
    const counts = {};
    unreadCounts.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res.status(500).json({ success: false, message: "Error fetching unread counts", error });
  }
};
