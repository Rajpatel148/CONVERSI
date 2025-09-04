import React, { useEffect, useState } from "react";
import { ArrowLeft, Ellipsis, MessageCircle, Plus, Search, Settings } from "lucide-react";
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
        nonFriends,
        setNonFriends,
        createChat,
    } = useAuth();

    const [search, setSearch] = useState("");
    const [nfSearch, setNfSearch] = useState("");

    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    // For Non friend list
    const [showNFlist, setShowNFlist] = useState(false);

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

    const filteredChats = chatList.filter((chat) => {
        if (
            chat.isGroup &&
            chat.name?.toLowerCase().includes(search.toLocaleLowerCase())
        )
            return true;
        if (Array.isArray(chat.members)) {
            return chat.members.some((member) =>
                member.fullname
                    ?.toLowerCase()
                    .includes(search.toLocaleLowerCase())
            );
        }
        return false;
    });

    const filteredNonFriends = nonFriends.filter((nf) =>
        nf.fullname?.toLowerCase().includes(nfSearch.toLowerCase())
    );

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
            console.log("Log outed");
            navigate("/");
        } catch (error) {
            console.log(error);
        }
        handleClose();
    };

    function timeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
            { label: "year", seconds: 31536000 },
            { label: "month", seconds: 2592000 },
            { label: "week", seconds: 604800 },
            { label: "day", seconds: 86400 },
            { label: "hour", seconds: 3600 },
            { label: "minute", seconds: 60 },
            { label: "second", seconds: 1 },
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `Last seen ${count} ${interval.label}${
                    count !== 1 ? "s" : ""
                } ago`;
            }
        }

        return "Last seen just now";
    }

    const handleNFclick = async (nf) => {
        const data = {
            members: [nf._id, user._id],
        };

        try {
            const newChat = await createChat(data);

            // 1. Add new chat at the beginning of chatList
            setChatList((prev) => [newChat, ...prev]);
            // 2. Remove nf from nfList
            setNonFriends((prev) => prev.filter((item) => item._id !== nf._id));
            // 3. Set active chat
            setActiveChatId(newChat._id);
            // 4. showNFlist is off
            setShowNFlist(false);
        } catch (error) {
            console.log(error);
        }
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
                            <button onClick={() => setShowNFlist(true)}>
                                <Plus />
                            </button>
                            <button>
                                <Settings />
                            </button>
                        </div>
                    </div>

                    {!showNFlist ? (
                        <Box className="search-bar">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Box>
                    ) : (
                        // New search bar with back button
                        <Box className="nf-search">
                            <button
                                onClick={() => {
                                    setShowNFlist(false);
                                    setNfSearch("");
                                }}
                            >
                                <ArrowLeft />
                            </button>
                            <input
                                type="text"
                                placeholder="Search friends..."
                                value={nfSearch}
                                onChange={(e) => setNfSearch(e.target.value)}
                            />
                        </Box>
                    )}
                </div>

                {/* Chat list */}
                {!showNFlist ? (
                    <div className="chat-list">
                        {Array.isArray(filteredChats) &&
                            filteredChats.map((chat) => (
                                <ChatBar key={chat._id} data={chat} />
                            ))}
                    </div>
                ) : (
                    <div className="chat-list">
                        {Array.isArray(filteredNonFriends) &&
                        filteredNonFriends.length > 0 ? (
                            filteredNonFriends.map((nf) => (
                                <div
                                    className="chat-bar"
                                    key={nf._id}
                                    onClick={() => handleNFclick(nf)}
                                    style={{
                                        backgroundColor:
                                            activeChatId === nf._id &&
                                            "rgba(10, 153, 67, 0.578)",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div className="chat-bar-avatar">
                                        <Avatar
                                            src={nf?.avatar}
                                            alt={nf?.fullname}
                                            sx={{
                                                width: "56px",
                                                height: "56px",
                                                objectFit: "cover",
                                            }}
                                        />
                                    </div>
                                    <div className="chat-bar-info">
                                        <div
                                            className="info-top"
                                            style={{
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            {nf?.fullname}
                                        </div>
                                        <div
                                            className="info-bottom"
                                            style={{
                                                fontSize: "10px",
                                            }}
                                        >
                                            {timeAgo(nf.lastseen)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <button className="invite">Invite friends</button>
                        )}
                    </div>
                )}
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
