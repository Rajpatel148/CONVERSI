import React, { useEffect, useState } from "react";
import { Ellipsis, MessageCircle, Plus, Search, Settings } from "lucide-react";
import ChatBar from "./ChatBar";
import Box from "@mui/material/Box";
import "./ChatSideBar.css";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate } from "react-router-dom";

const ChatSideBar = () => {
    const {
        user,
        activeChatId,
        setActiveChatId,
        chatList,
        setChatList,
        socket,
        logout,
    } = useAuth();

    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    useEffect(() => {
        socket.on("new-message-notification", async (data) => {
            let newlist = [...chatList]; // clone first
            let index = newlist.findIndex((c) => c._id === data.chatId);

            if (index === -1) {
                newlist.unshift(data.chat);
            } else {
                newlist[index].latestMessage = data;

                if (activeChatId !== data.chatId) {
                    newlist[index].unreadCounts = newlist[
                        index
                    ].unreadCounts.map((uc) => {
                        if (uc.userId === user._id)
                            uc.count = (uc.count || 0) + 1;
                        return uc;
                    });
                    newlist[index].updatedAt = new Date();
                }

                // move updated chat to top
                let updatedChat = newlist.splice(index, 1)[0];
                newlist.unshift(updatedChat);
            }

            setChatList(newlist);
        });

        return () => {
            socket.off("new-message-notification");
        };
    }, [chatList, activeChatId, user, setChatList, socket]);

    // 🔍 Fix: use chatList instead of undefined "chats"
    const handleSearch = (e) => {
        e.preventDefault();
        const searchLower = search.toLowerCase();

        const filteredChats = chatList.filter((chat) => {
            if (chat.isGroup && chat.name?.toLowerCase().includes(searchLower))
                return true;
            if (Array.isArray(chat.members)) {
                return chat.members.some((member) =>
                    member.fullname?.toLowerCase().includes(searchLower)
                );
            }
            return false;
        });

        setChatList(filteredChats);
    };

    // Menu handlers
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);

    const handleViewProfile = () => {
        console.log("View profile clicked");
        handleClose();
    };

    const handleLogout = async () => {
        console.log("Logout clicked");
        // 🔥 You can clear token / context here
        try {
            await logout();
            console.log("Log outed")
            navigate("/");
        } catch (error) {
            console.log(error);
        }
        handleClose();
    };

    return (
        <div className="chatSideBar">
            {/* Header */}
            <div className="1">
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
                            <ChatBar key={chat._id} data={chat} />
                        ))}
                </div>
            </div>
            {/* User Profile + Menu */}
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
                <div>
                    <button className="more-options" onClick={handleClick}>
                        <Ellipsis />
                    </button>
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "left",
                        }}
                        slotProps={{
                            paper: {
                                elevation: 0,
                                sx: {
                                    borderRadius: "16px",
                                    minWidth: 140,
                                    backgroundColor: "rgba(255, 255, 255)", // semi-transparent white
                                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.11)", // soft shadow
                                    overflow: "hidden",
                                    "& .MuiMenuItem-root": {
                                        fontSize: "1rem",
                                        fontWeight: 500,
                                        px: 2,
                                        py: 1.2,
                                        transition: "all 0.2s ease",
                                    },
                                },
                            },
                        }}
                    >
                        <MenuItem
                            onClick={handleViewProfile}
                            sx={{
                                "&:hover": {
                                    bgcolor: "#1976d22b", // softer hover
                                    color: "#1976d2",
                                },
                            }}
                        >
                            View Profile
                        </MenuItem>
                        <MenuItem
                            onClick={handleLogout}
                            sx={{
                                color: "error.main",
                                "&:hover": {
                                    bgcolor: "rgba(255,0,0,0.1)",
                                    color: "error.dark",
                                },
                            }}
                        >
                            Logout
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </div>
    );
};

export default ChatSideBar;
