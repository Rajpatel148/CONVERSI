import React from "react";
import Avatar from "@mui/material/Avatar";
import { ArrowLeft, EllipsisVertical, Phone, Video } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../../context/Authcotext";

const ChatHeader = ({ data }) => {
    const [userData, setUserData] = useState(data);
    const { socket, setActiveChatId } = useAuth();
    useEffect(() => {
        socket.on("user-online", (id) => {
            if (userData?.isGroup) return;
            if (userData?.members?.[0]?._id === id) {
                setUserData((prev) => ({
                    ...prev,
                    members: [
                        {
                            ...prev.members[0],
                            isOnline: true,
                        },
                    ],
                }));
            }
        });

        socket.on("user-offline", (id) => {
            if (userData?.isGroup) return;
            if (userData?.members?.[0]?._id === id) {
                setUserData((prev) => ({
                    ...prev,
                    members: [
                        {
                            ...prev.members[0],
                            isOnline: false,
                        },
                    ],
                }));
            }
        });
        return () => {
            socket.off("user-online");
            socket.off("user-offline");
        };
    }, [socket, userData]);
    return (
        <div className="chat-window-header">
            <div className="header-profile">
                <button
                    className="header-back-btn"
                    onClick={() => {
                        setActiveChatId("");
                    }}
                >
                    <ArrowLeft />
                </button>
                <Avatar
                    src={userData?.avatar || ""}
                    alt="Profile"
                    sx={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
                <div className="header-info">
                    <h4
                        style={{
                            textTransform: "capitalize",
                        }}
                    >
                        {userData?.isGroup
                            ? userData?.name
                            : userData?.members?.[0]?.fullname ||
                              "Unknown User"}
                    </h4>
                    <p>
                        {userData?.isGroup
                            ? ""
                            : userData?.members[0].isOnline
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
