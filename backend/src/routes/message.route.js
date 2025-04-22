import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  markMessagesAsRead,
  getUnreadCounts,
  getUnreadSenders, // ✅ Make sure this is implemented in your controller
} from "../controllers/message.controller.js";

const router = express.Router();

// ✅ Get users for the sidebar
router.get('/users', protectRoute, getUsersForSidebar);

// ✅ Get unread message counts per chat
router.get("/unread-counts", protectRoute, getUnreadCounts);

// ✅ Get list of senders who sent unread messages
router.get("/unread-senders", protectRoute, getUnreadSenders);

// ✅ Mark all messages as read for a specific chat
router.put("/read/user/:id", protectRoute, markMessagesAsRead);

// ✅ Send a message
router.post("/send/:id", protectRoute, sendMessage);

// ✅ Get messages for a specific chat (MUST come after specific routes)
router.get('/:id', protectRoute, getMessages);

export default router;
