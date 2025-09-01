import React from "react";
import Avatar from "@mui/material/Avatar";
import { EllipsisVertical, Phone, Video } from "lucide-react";
import { useAuth } from "../../context/Authcotext";

const ChatHeader = () => {
    const { user } = useAuth();
    return (
        <div className="chat-window-header">
            <div className="header-profile">
                <Avatar
                    src={user?.avatar}
                    alt="Profile"
                    sx={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
                <div className="header-info">
                    <h4
                        style={{
                            textTransform: "capitalize",
                        }}
                    >
                        {user.fullname}
                    </h4>
                    <p>{user.isOnline ? "Online":"Offline"}</p>
                </div>
            </div>
            <div className="header-btns">
                <button className="header-btn">
                    <Phone size={20} />
                </button>
                <button className="header-btn">
                    <Video size={20} />
                </button>
                <button className="header-btn">
                    <EllipsisVertical size={20} />
                </button>
            </div>
        </div>
    );
};

export default ChatHeader;
