import React from "react";
import Avatar from "@mui/material/Avatar";
import { EllipsisVertical, Phone, Video } from "lucide-react";

const ChatHeader = ({ data }) => {
    return (
        <div className="chat-window-header">
            <div className="header-profile">
                <Avatar
                    src={data?.avatar || ""}
                    alt="Profile"
                    sx={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
                <div className="header-info">
                    <h4
                        style={{
                            textTransform: "capitalize",
                        }}
                    >
                        {data?.isGroup
                            ? data?.name
                            : data?.members?.[0]?.fullname || "Unknown User"}
                    </h4>
                    <p>
                        {data?.isGroup
                            ? ""
                            : data?.members[0].isOnline
                            ? "Online"
                            : "Offline"}
                    </p>
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
