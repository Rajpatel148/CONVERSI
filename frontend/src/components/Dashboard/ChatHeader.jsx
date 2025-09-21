import React from "react";
import Avatar from "@mui/material/Avatar";
import { ArrowLeft, EllipsisVertical, Phone, Video } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "../../context/Authcotext";

const ChatHeader = ({ data }) => {
    // Keep a local copy so we can toggle online status updates, but make sure it syncs when props change
    const [userData, setUserData] = useState(data);
    const { socket, setActiveChatId, setActiveBox } = useAuth();

    // Sync local state when the selected chat changes
    useEffect(() => {
        setUserData(data);
    }, [data]);
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
                    sx={{
                        width: "50px",
                        height: "50px",
                        objectFit: "cover",
                        cursor: "pointer",
                    }}
                    onClick={() =>
                        setActiveBox({
                            type: "profile",
                            payload: {
                                name: userData?.members[0]?.fullname,
                                username: userData?.members[0]?.username,
                                avatar: userData?.members[0]?.avatar,
                                status: userData?.members[0]?.isOnline
                                    ? "Online"
                                    : "Offline"
                            },
                        })
                    }
                />
                <div
                    className="header-info"
                    onClick={() =>
                        setActiveBox({
                            type: "profile",
                            payload: {
                                name: userData?.members[0]?.fullname,
                                username: userData?.members[0]?.username,
                                avatar: userData?.members[0]?.avatar,
                                status: userData?.members[0]?.isOnline
                                    ? "Online"
                                    : "Offline"
                            },
                        })
                    }
                >
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
                            : userData?.members?.[0]?.isOnline
                            ? "Online"
                            : "Offline"}
                    </p>
                </div>
            </div>
            <div className="header-btns">
                <button
                    className="header-btn"
                    onClick={() => setActiveBox({ type: "voiceCall" })}
                >
                    <Phone size={20} />
                </button>
                <button
                    className="header-btn"
                    onClick={() => setActiveBox({ type: "videoCall" })}
                >
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
