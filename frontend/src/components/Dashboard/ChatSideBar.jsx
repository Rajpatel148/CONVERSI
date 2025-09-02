import React, { useState } from "react";
import { Ellipsis, MessageCircle, Plus, Search, Settings } from "lucide-react";
import ChatBar from "./ChatBar";
import Box from "@mui/material/Box";
import "./ChatSideBar.css";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";

const ChatSideBar = ({ chats, activeChatId, setActiveChatId }) => {
    const { user } = useAuth();
    const [search, setSearch] = useState("");

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
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </Box>
                </div>
                {/* Chat list */}
                <div className="chat-list">
                    {Array.isArray(filteredChats) &&
                        filteredChats.map((chat) => (
                            <ChatBar
                                key={chat._id}
                                data={chat}
                                activeChatId={activeChatId}
                                setActiveChatId={setActiveChatId}
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
