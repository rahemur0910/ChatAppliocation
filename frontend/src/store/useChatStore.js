import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { playNotificationSound, showNotification } from "../lib/utils";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadMessages: {}, // Track unread messages per user
  allMessagesListeners: [], // Track all message listeners

  // Actions
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      // Clear unread count when fetching messages
      get().clearUnreadMessages(userId);
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  // Subscribe to messages from selected user only
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const listener = (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    };

    socket.on("newMessage", listener);
    set({ allMessagesListeners: [...get().allMessagesListeners, listener] });
  },

  // Subscribe to ALL messages (for notifications)
  subscribeToAllMessages: () => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    const { users } = get();

    const listener = (newMessage) => {
      // Ignore our own messages
      if (newMessage.senderId === authUser._id) return;
      
      // Ignore messages from currently selected user (handled by subscribeToMessages)
      if (newMessage.senderId === get().selectedUser?._id) return;

      // Add to unread count
      get().addUnreadMessage(newMessage.senderId);

      // Find sender info
      const sender = users.find(u => u._id === newMessage.senderId) || { 
        fullName: "Unknown User",
        profilePic: "/avatar.png"
      };

      // Play sound and show notification
      playNotificationSound();
      showNotification(`New message from ${sender.fullName}`, {
        body: newMessage.text || "Attachment received",
        icon: sender.profilePic
      });
    };

    socket.on("newMessage", listener);
    set({ allMessagesListeners: [...get().allMessagesListeners, listener] });
  },

  // Unsubscribe from all message listeners
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    get().allMessagesListeners.forEach(listener => {
      socket.off("newMessage", listener);
    });
    set({ allMessagesListeners: [] });
  },

  // Unread messages handling
  addUnreadMessage: (userId) => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [userId]: (state.unreadMessages[userId] || 0) + 1
      }
    }));
  },

  clearUnreadMessages: (userId) => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [userId]: 0
      }
    }));
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));