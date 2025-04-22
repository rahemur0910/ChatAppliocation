import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  markMessagesAsRead,
  getUnreadCounts
} from "../controllers/message.controller.js";

const router = express.Router();

// Get users for the sidebar (except the logged-in user)
router.get('/users', protectRoute, getUsersForSidebar);

// Get messages for a specific chat
router.get('/:id', protectRoute, getMessages);

// Send a message to a specific user
router.post("/send/:id", protectRoute, sendMessage);

// Mark messages as read for a specific chat
router.put("/read/user/:id", protectRoute, markMessagesAsRead);

// Get unread message counts for the logged-in user
router.get("/unread-counts", protectRoute, getUnreadCounts);

export default router;
