import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
  },
  image: {
    type: String,
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat", // This helps with group or individual chat referencing
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Keeps track of users who have read the message
    }
  ],
}, {
  timestamps: true,
});

// Indexing for performance
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ chatId: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
