import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import moment from "moment";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadMessages,
    setUnreadCount,
    unreadSenders, // This should now be available in your store
    setUnreadSenders,  // We will use this to store unread senders
  } = useChatStore();

  const { onlineUsers, user } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Fetch users after login
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Fetch unread message counts and unread senders after login
  useEffect(() => {
    if (user) {
      const fetchUnreadCounts = async () => {
        try {
          const res = await axiosInstance.get("/messages/unread-counts", {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          Object.entries(res.data).forEach(([chatId, count]) => {
            setUnreadCount(chatId, count);
          });
        } catch (err) {
          console.error("Failed to fetch unread counts", err);
        }
      };

      const fetchUnreadSenders = async () => {
        try {
          // Fetch unread senders (users who have sent unread messages)
          const res = await axiosInstance.get("/messages/unread-senders", {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setUnreadSenders(res.data.map((s) => s.senderId));  // Store unread senders
        } catch (err) {
          console.error("Failed to fetch unread senders", err);
        }
      };

      fetchUnreadCounts();
      fetchUnreadSenders();
    }
  }, [user, setUnreadCount, setUnreadSenders]);

  // Filter users to show only online users if selected
  const filteredUsers = showOnlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;

  // Sort users by unread message count (descending)
  const sortedUsers = filteredUsers.sort((a, b) => {
    const unreadA = unreadMessages[a._id] || 0;
    const unreadB = unreadMessages[b._id] || 0;
    return unreadB - unreadA;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  // Ensure unreadSenders is always an array
  const unreadSendersArray = unreadSenders || [];

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {sortedUsers.map((u) => {
          const unreadCount = unreadMessages[u._id] || 0;
          const lastMsg = u.lastMessage;
          const lastText = lastMsg?.text || "";
          const lastTime = lastMsg?.createdAt
            ? moment(lastMsg.createdAt).fromNow()
            : "";

          return (
            <button
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`w-full px-3 py-2 flex items-center gap-3 justify-start
                hover:bg-base-300 transition-colors relative
                ${selectedUser?._id === u._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                ${unreadSendersArray.includes(u._id) ? "bg-yellow-100" : ""}  {/* Highlight unread senders */}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={u.profilePic || "/avatar.png"}
                  alt={u.name}
                  className="size-12 object-cover rounded-full"
                />
                {unreadCount > 0 && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </div>
                )}
                {onlineUsers.includes(u._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="flex justify-between items-center">
                  <div
                    className={`truncate ${unreadCount > 0 ? "font-bold text-lg" : "text-base"}`}
                  >
                    {u.fullName}
                  </div>
                  <div className="text-xs text-zinc-400 ml-2">{lastTime}</div>
                </div>
                <div
                  className={`text-sm truncate ${
                    unreadCount > 0 ? "font-semibold text-zinc-700" : "text-zinc-500"
                  }`}
                >
                  {lastText}
                </div>
              </div>
            </button>
          );
        })}

        {sortedUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No users found</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
