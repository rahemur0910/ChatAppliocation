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
  unreadMessages: JSON.parse(localStorage.getItem("unreadMessages") || "{}"),
  allMessagesListeners: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load users.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      await axiosInstance.put(`/messages/read/user/${userId}`);
      get().clearUnreadMessages(userId);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load messages.");
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
      toast.error(error?.response?.data?.message || "Failed to send message.");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const listener = (newMessage) => {
      if (newMessage.senderId !== selectedUser._id) return;
      set({ messages: [...get().messages, newMessage] });
    };

    socket.on("newMessage", listener);
    set({ allMessagesListeners: [...get().allMessagesListeners, listener] });
  },

  subscribeToAllMessages: () => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    const { users } = get();

    const listener = (newMessage) => {
      if (newMessage.senderId === authUser._id) return;
      if (newMessage.senderId === get().selectedUser?._id) return;

      get().addUnreadMessage(newMessage.senderId);

      const sender = users.find(u => u._id === newMessage.senderId) || {
        fullName: "Unknown User",
        profilePic: "/avatar.png",
      };

      playNotificationSound();
      showNotification(`New message from ${sender.fullName}`, {
        body: newMessage.text || "📎 Attachment received",
        icon: sender.profilePic,
      });
    };

    socket.on("newMessage", listener);
    set({ allMessagesListeners: [...get().allMessagesListeners, listener] });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    get().allMessagesListeners.forEach(listener => {
      socket.off("newMessage", listener);
    });
    set({ allMessagesListeners: [] });
  },

  addUnreadMessage: (userId) => {
    set(state => {
      const newUnreadMessages = {
        ...state.unreadMessages,
        [userId]: (state.unreadMessages[userId] || 0) + 1,
      };
      localStorage.setItem("unreadMessages", JSON.stringify(newUnreadMessages));
      return { unreadMessages: newUnreadMessages };
    });
  },

  clearUnreadMessages: (userId) => {
    set(state => {
      const newUnreadMessages = { ...state.unreadMessages, [userId]: 0 };
      localStorage.setItem("unreadMessages", JSON.stringify(newUnreadMessages));
      return { unreadMessages: newUnreadMessages };
    });
  },

  // ✅ Handle unread count from server
  setUnreadCountsFromServer: (counts) => {
    set(state => {
      const stored = { ...state.unreadMessages };
      for (const [userId, count] of Object.entries(counts)) {
        stored[userId] = (stored[userId] || 0) + count;
      }
      localStorage.setItem("unreadMessages", JSON.stringify(stored));
      return { unreadMessages: stored };
    });
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
