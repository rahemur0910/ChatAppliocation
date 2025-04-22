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

    // Validate if user is trying to fetch their own messages
    if (!userToChatId) {
      return res.status(400).json({ error: "User to chat ID is required." });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });  // Ensure messages are sorted chronologically

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a message to a specific user
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required." });
    }

    let imageUrl = null;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Create and save the new message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Update the unread message count for the receiver
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Ensure unreadMessageCount is an object
    if (!receiver.unreadMessageCount) {
      receiver.unreadMessageCount = {};
    }

    // Use senderId as the key for unread count
    const senderKey = senderId.toString();
    if (receiver.unreadMessageCount[senderKey]) {
      receiver.unreadMessageCount[senderKey] += 1;
    } else {
      receiver.unreadMessageCount[senderKey] = 1;
    }

    await receiver.save();

    // Emit the message to the receiver via socket
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', newMessage);
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark messages as read for a specific chat
export const markMessagesAsRead = async (req, res) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  // Validate if user is trying to mark their own messages
  if (!userToChatId) {
    return res.status(400).json({ error: "User to chat ID is required." });
  }

  try {
    const result = await Message.updateMany(
      {
        senderId: userToChatId,
        receiverId: myId,
        readBy: { $ne: myId },
      },
      { $push: { readBy: myId } }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: false, message: "No new messages to mark as read." });
    }

    // Update the unread count for the sender
    const sender = await User.findById(userToChatId);
    if (!sender) {
      return res.status(404).json({ error: "Sender not found." });
    }

    if (sender.unreadMessageCount && sender.unreadMessageCount[myId]) {
      sender.unreadMessageCount[myId] = 0;
      await sender.save();
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
    // Aggregate unread messages grouped by sender
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          readBy: { $ne: userId },
          receiverId: userId,
        },
      },
      {
        $group: {
          _id: "$senderId", // Group by senderId instead of chatId
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    unreadCounts.forEach((item) => {
      counts[item._id.toString()] = item.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res.status(500).json({ success: false, message: "Error fetching unread counts", error });
  }
};

// Get senders of unread messages for the logged-in user
export const getUnreadSenders = async (req, res) => {
  const userId = req.user._id;

  try {
    // Aggregate messages where the logged-in user is the receiver and the message is unread
    const unreadSenders = await Message.aggregate([
      {
        $match: {
          readBy: { $ne: userId }, // Unread messages
          receiverId: userId,      // For the logged-in user as receiver
        },
      },
      {
        $group: {
          _id: "$senderId", // Group by senderId to get unique senders
        },
      },
      {
        $project: {
          _id: 0,
          senderId: "$_id", // Only include senderId in the result
        },
      },
    ]);

    // Extract the senderId from the aggregation result
    const senders = unreadSenders.map(item => item.senderId);

    res.status(200).json(senders);
  } catch (error) {
    console.error("Error in getUnreadSenders:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
