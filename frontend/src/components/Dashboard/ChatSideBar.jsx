import React, { useEffect, useState } from "react";
import { Ellipsis, MessageCircle, Plus, Search, Settings } from "lucide-react";
import ChatBar from "./ChatBar";
import Box from "@mui/material/Box";
import "./ChatSideBar.css";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";

const ChatSideBar = () => {
    const { user, activeChatId, setActiveChatId, chatList, setChatList ,socket} =
        useAuth();
    const [search, setSearch] = useState("");
    useEffect(() => {
        socket.on("new-message-notification", async (data) => {
            let newlist = chatList;
            let index = newlist.findIndex((c) => c._id === data.chatId);
            if (index === -1) newlist.unshift(data.chat);
            else {
                newlist[index].latestMessage = data;
            }

            if (activeChatId !== data.chatId) {
                newlist[index].unreadCounts = newlist[index].unreadCounts.map(
                    (uc) => {
                        if (uc.userId === user._id)
                            uc.count = (uc.count || 0) + 1;
                        return uc;
                    }
                );
                newlist[index].updatedAt = new Date();
            }

            // If you want to move the updated chat to the beginning of the list
            let updatedChat = newlist.splice(index, 1)[0];
            newlist.unshift(updatedChat);

            setChatList([...newlist]); // Create a new array to update state
        });

        
        return () => {
            socket.off("new-message-notification");
        };
    }, []);

    // Handle search input change
    const handleSearch = (e) => {
        e.preventDefault();
        const filteredChats = chats.filter((chat) => {
            const searchLower = search.toLowerCase();
            // Group chat: match by name
            if (chat.isGroup && chat.name?.toLowerCase().includes(searchLower))
                return true;
            // Direct chat: match any member's fullname
            if (Array.isArray(chat.members)) {
                return chat.members.some((member) =>
                    member.fullname?.toLowerCase().includes(searchLower)
                );
            }
            return false;
        });
        setChatList(filteredChats);
    };

    return (
        <div className="chatSideBar">
            <div className="1">
                {/* Header */}
                <div className="chat-header">
                    <div className="header">
                        <div className="header-logo">
                            <div className="logo">
                                <MessageCircle color="white" />
                            </div>
                            <h2>Conversi</h2>
                        </div>
                        <div className="header-btns">
                            <button>
                                <Plus />
                            </button>
                            <button>
                                <Settings />
                            </button>
                        </div>
                    </div>
                    <Box className="search-bar">
                        <form onSubmit={handleSearch}>
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </form>
                    </Box>
                </div>
                {/* Chat list */}
                <div className="chat-list">
                    {Array.isArray(chatList) &&
                        chatList.map((chat) => (
                            <ChatBar
                                key={chat._id}
                                data={chat}
                            />
                        ))}
                </div>
            </div>
            {/* User Profile */}
            <div className="user-profile">
                <div className="profile">
                    <Avatar
                        src={user?.avatar || null}
                        alt="User Avatar"
                        sx={{
                            width: "56px",
                            height: "56px",
                            objectFit: "cover",
                        }}
                    />
                    <p className="info">
                        {user?.fullname || "Unknown User"}
                        <br />
                        <span>{user?.isOnline ? "Online" : "Offline"}</span>
                    </p>
                </div>
                <button className="more-options">
                    <Ellipsis />
                </button>
            </div>
        </div>
    );
};

export default ChatSideBar;
