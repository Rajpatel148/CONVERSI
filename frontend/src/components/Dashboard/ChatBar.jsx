import React from "react";
import "./ChatBar.css";
import Avatar from "@mui/material/Avatar";

const ChatBar = ({ data }) => {
    console.log(data);
    

    const isGroup = data?.isGroup;
    const name = isGroup
        ? data?.name || "Unnamed Group"
        : data?.members?.[0]?.fullname || "Unknown User";

    const avatarSrc = data?.avatar || "";
    const latestMsg = data?.latestMsg || "No messages yet";
    const unreadCount = Array.isArray(data?.unreadCounts)
        ? data.unreadCounts.length
        : 0;

    return (
        <div className="chat-bar">
            <div className="chat-bar-avatar">
                <Avatar
                    src={avatarSrc}
                    alt={name}
                    sx={{
                        width: "56px",
                        height: "56px",
                        objectFit: "cover",
                    }}
                />
            </div>
            <div className="chat-bar-info">
                <div className="info-top">{name}</div>
                <div className="info-bottom">
                    <p>{latestMsg}</p>
                    {unreadCount > 0 && (
                        <div className="unread-badge">{unreadCount}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatBar;
