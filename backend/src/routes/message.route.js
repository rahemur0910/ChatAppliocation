import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  markMessagesAsRead
} from "../controllers/message.controller.js";

const router = express.Router();

router.get('/users', protectRoute, getUsersForSidebar);
router.get('/:id', protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

// ✅ New route to mark messages as read
router.put("/read/user/:id", protectRoute, markMessagesAsRead);


export default router;
