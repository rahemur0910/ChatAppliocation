import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, playNotificationSound, showNotification } from "../lib/utils";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { toast } from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    users,
    subscribeToMessages,
    subscribeToAllMessages,
    unsubscribeFromMessages,
    unreadMessages,
    clearUnreadMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const prevMessagesLength = useRef(0);
  const currentChatUserId = selectedUser?._id;

  // Initialize chat and subscriptions
  useEffect(() => {
    if (!currentChatUserId) return;

    getMessages(currentChatUserId);
    subscribeToMessages();
    subscribeToAllMessages(); // Subscribe to all messages for notifications
    clearUnreadMessages(currentChatUserId);

    return () => unsubscribeFromMessages();
  }, [currentChatUserId]);

  // Handle notifications for messages from other users
  useEffect(() => {
    const handleExternalMessage = (newMessage) => {
      // Skip if message is from current chat or from ourselves
      if (newMessage.senderId === currentChatUserId || newMessage.senderId === authUser._id) return;

      // Find sender info
      const sender = users.find(u => u._id === newMessage.senderId) || {
        fullName: "Someone",
        profilePic: "/avatar.png"
      };

      // Play sound
      playNotificationSound();

      // Show browser notification
      showNotification(`New message from ${sender.fullName}`, {
        body: newMessage.text || "Attachment received",
        icon: sender.profilePic,
        silent: true // We're playing our own sound
      });

      // Show in-app toast if tab is active
      toast.success(`📩 New message from ${sender.fullName}`, {
        position: "bottom-left",
        duration: 3000
      });
    };

    // Listen for all incoming messages
    const socket = useAuthStore.getState().socket;
    socket.on("newMessage", handleExternalMessage);

    return () => {
      socket.off("newMessage", handleExternalMessage);
    };
  }, [currentChatUserId, authUser._id, users]);

  // Handle auto-scroll for current chat
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Check for new messages in current chat
    if (messages.length > prevMessagesLength.current && prevMessagesLength.current > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && lastMessage.senderId !== authUser._id) {
        toast.success(`📩 New message from ${selectedUser?.fullName || "a user"}`, {
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "8px",
          },
        });
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, authUser._id, selectedUser?.fullName]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader unreadCount={unreadMessages[currentChatUserId] || 0} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser?.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;