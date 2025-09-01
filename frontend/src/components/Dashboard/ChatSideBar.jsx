import React from "react";
import { Ellipsis, MessageCircle, Plus, Search, Settings } from "lucide-react";
import ChatBar from "./ChatBar";
import Box from "@mui/material/Box";
import "./ChatSideBar.css";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";

const ChatSideBar = ({ chats }) => {
    const { user } = useAuth();

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
                        />
                    </Box>
                </div>
                {/* Chat list */}
                <div className="chat-list">
                    {Array.isArray(chats) &&
                        chats.map((chat) => (
                            <ChatBar key={chat._id} data={chat} />
                        ))}
                </div>
            </div>
            {/* User Profile */}
            <div className="user-profile">
                <div className="profile">
                    <Avatar
                        src={user?.avatar || "demo.jpeg"}
                        alt="User Avatar"
                        sx={{
                            width: "56px", // size of avatar
                            height: "56px",
                            objectFit: "cover", // ensures image fills the circle}} />
                        }}
                    />
                    <p className="info">
                        {user.fullname}
                        <br />
                        <span>{user.isOnline ? "Online" : "Offline"}</span>
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
