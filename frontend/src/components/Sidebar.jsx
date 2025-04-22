import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";  // Correct import for axiosInstance
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadMessages, // <- get unread counts from Zustand
    setUnreadCount, // Ensure you have a method to update unread counts
  } = useChatStore();

  const { onlineUsers, user } = useAuthStore();  // Access user from auth store
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        try {
          const res = await axiosInstance.get("/messages/unread-counts", {
            headers: { Authorization: `Bearer ${user.token}` }
          });

          Object.entries(res.data).forEach(([chatId, count]) => {
            setUnreadCount(chatId, count);
          });
        } catch (err) {
          console.error("Failed to fetch unread counts", err);
        }
      };

      fetchUnread();
    }
  }, [user, setUnreadCount]);  // Only run this effect when `user` is available

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Sorting users: Users with unread messages should appear first
  const sortedUsers = filteredUsers.sort((a, b) => {
    const unreadA = unreadMessages[a._id] || 0;
    const unreadB = unreadMessages[b._id] || 0;

    // Sort unread messages to appear first
    if (unreadA > unreadB) return -1;
    if (unreadA < unreadB) return 1;
    return 0;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

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
        {sortedUsers.map((user) => {
          const unreadCount = unreadMessages[user._id] || 0;

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full px-3 py-2 flex items-center gap-3 justify-start
                hover:bg-base-300 transition-colors relative
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />

                {/* Unread count displayed over the profile picture */}
                {unreadCount > 0 && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </div>
                )}

                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div
                  className={`font-medium truncate
                    ${unreadCount > 0 ? "font-bold text-lg" : ""}
                    transition-all duration-200
                    hover:text-blue-500`} // Bold and larger font size for unread messages, with hover effect
                >
                  {user.fullName}
                </div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          );
        })}

        {sortedUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
