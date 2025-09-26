import React, { useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Ellipsis,
    MessageCircle,
    Plus,
    Search,
    Settings,
} from "lucide-react";
import ChatBar from "./ChatBar";
import Box from "@mui/material/Box";
import "./ChatSideBar.css";
import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate } from "react-router-dom";
import SkeletonChatBar from "../Skeleton/SkeletonChatBar";
import toast from "react-hot-toast";

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
        setActiveBox,
    } = useAuth();
    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const filteredChats = chatList?.filter((chat) => {
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
    const [nfSearch, setNfSearch] = useState("");
    const filteredNonFriends = nonFriends?.filter((nf) =>
        nf.fullname?.toLowerCase().includes(nfSearch.toLowerCase())
    );

    const isChatsLoading = !Array.isArray(filteredChats);
    const isNFLoading = !Array.isArray(filteredNonFriends);

    // For Non friend list
    const [showNFlist, setShowNFlist] = useState(false);

    const activeChatIdRef = useRef(activeChatId);
    const userIdRef = useRef(user?._id);
    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);
    useEffect(() => {
        userIdRef.current = user?._id;
    }, [user?._id]);

    // New message notification sound setup
    const newMsgAudioRef = useRef(null);
    const audioPrimedRef = useRef(false);
    const ensureNewMsgAudio = () => {
        if (!newMsgAudioRef.current) {
            try {
                const a = new Audio("/new-chat.wav");
                a.preload = "auto";
                a.volume = 0.8;
                newMsgAudioRef.current = a;
            } catch (e) {
                console.warn(
                    "Failed to init new message audio:",
                    e?.message || e
                );
            }
        }
        return newMsgAudioRef.current;
    };
    const playNewMsgSound = async () => {
        try {
            const a = ensureNewMsgAudio();
            if (!a) return;
            a.currentTime = 0;
            await a.play();
        } catch (e) {
            // ignore autoplay block silently
        }
    };
    // Prime audio on first user gesture to avoid autoplay restrictions
    useEffect(() => {
        const prime = async () => {
            if (audioPrimedRef.current) return;
            const a = ensureNewMsgAudio();
            if (!a) return;
            try {
                a.muted = true;
                await a.play();
                a.pause();
                a.currentTime = 0;
                a.muted = false;
                audioPrimedRef.current = true;
            } catch {
                // still blocked; will try again on next gesture
            }
        };
        const onPointerDown = () => {
            prime();
        };
        const onKeyDown = () => {
            prime();
        };
        window.addEventListener("pointerdown", onPointerDown, { once: true });
        window.addEventListener("keydown", onKeyDown, { once: true });
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    useEffect(() => {
        socket.on("new-chat-created", (newChat) => {
            setChatList((prev) => [newChat, ...prev]);
            setNonFriends((prev) =>
                prev.filter((nf) => !newChat.members.includes(nf._id))
            );
        });

        socket.on("new-message-notification", async (payload) => {
            const { chatId, chat, message } = payload || {};
            let shouldPlaySound = false;
            setChatList((prev) => {
                let list = Array.isArray(prev) ? [...prev] : [];
                let index = list.findIndex((c) => c._id === chatId);
                if (index === -1 && chat) {
                    list.unshift(chat);
                    index = 0;
                    // If this arrives while not viewing that chat and not sent by me, schedule sound
                    const isFromMe =
                        message?.sender?._id === userIdRef.current ||
                        message?.sender === userIdRef.current;
                    if (activeChatIdRef.current !== chatId && !isFromMe) {
                        shouldPlaySound = true;
                    }
                }
                if (index > -1) {
                    // update preview
                    list[index].latestMsg = message?.text
                        ? message.text
                        : message?.imageUrl
                        ? "📷 Image"
                        : list[index].latestMsg;
                    // increment unread if not active chat
                    if (activeChatIdRef.current !== chatId) {
                        list[index].unreadCounts = (
                            list[index].unreadCounts || []
                        ).map((uc) => {
                            const uid = uc.userId?._id || uc.userId;
                            if (uid === userIdRef.current) {
                                shouldPlaySound = true;
                                return { ...uc, count: (uc.count || 0) + 1 };
                            }
                            return uc;
                        });
                    }
                    list[index].updatedAt = new Date().toISOString();
                    // move to top
                    const updated = list.splice(index, 1)[0];
                    list.unshift(updated);
                }
                return list;
            });
            if (shouldPlaySound) {
                playNewMsgSound();
            }
        });

        return () => {
            socket.off("new-chat-created");
            socket.off("new-message-notification");
        };
    }, [socket, setChatList, setNonFriends]);

    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    const open = Boolean(anchorEl);
    // Menu handlers
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);
    const handleViewProfile = () => {
        setActiveBox({
            type: "profile",
            payload: {
                _id: user?._id,
                name: user?.fullname,
                username: user?.username,
                avatar: user?.avatar,
                status: user?.isOnline ? "Online" : user?.lastseen,
                isMe: true,
            },
        });
        handleClose();
    };

    const handleLogout = async () => {
        try {
            await logout();
            socket.emit("logout", user._id);
            navigate("/");
        } catch (error) {
            console.log(error);
        }
        handleClose();
    };

    // Function to display "last seen" in human-readable format
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
            const newChat = await createChat(data); //! add socket event for new chat creation - emit message here

            socket.emit("new-chat-created", newChat);
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
                        <div
                            className="header-logo"
                            onClick={() =>
                                window.open("https://conversi-nine.vercel.app")
                            }
                        >
                            <div className="logo">
                                <MessageCircle color="white" />
                            </div>
                            <h2>Conversi</h2>
                        </div>
                        <div className="header-btns">
                            <button onClick={() => setShowNFlist(true)}>
                                <Plus />
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
                        {isChatsLoading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                  <SkeletonChatBar key={i} />
                              ))
                            : filteredChats.map((chat) => (
                                  <ChatBar key={chat._id} chatUserData={chat} />
                              ))}
                    </div>
                ) : (
                    <div className="chat-list">
                        {isNFLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonChatBar key={i} />
                            ))
                        ) : filteredNonFriends.length > 0 ? (
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
                            <button
                                className="invite"
                                onClick={() => {
                                    navigator.clipboard
                                        .writeText(
                                            "https://conversi-nine.vercel.app"
                                        )
                                        .then(() => {
                                            setCopied(true);
                                            setTimeout(
                                                () => setCopied(false),
                                                2000
                                            );
                                        });
                                    toast.success("Link copied");
                                }}
                            >
                                {copied ? "Link Copied!" : "Invite Friends"}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {/* User Profile + Menu */}
            <div className="user-profile">
                <div
                    className="profile"
                    onClick={handleViewProfile}
                    style={{ cursor: "pointer" }}
                >
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
                            onClick={() => {
                                setActiveBox({ type: "settings" });
                                handleClose();
                            }}
                            sx={{
                                "&:hover": {
                                    bgcolor: "#1976d22b", // softer hover
                                    color: "#1976d2",
                                },
                            }}
                        >
                            Setting
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
                        <MenuItem
                            onClick={() => {
                                setActiveBox({
                                    type: "deleteAccount",
                                    payload: { userId: user?._id },
                                });
                                handleClose();
                            }}
                            sx={{
                                color: "error.main",
                                "&:hover": {
                                    bgcolor: "rgba(255,0,0,0.1)",
                                    color: "error.dark",
                                },
                            }}
                        >
                            Delete Account
                        </MenuItem>
                    </Menu>
                </div>
            </div>
        </div>
    );
};

export default ChatSideBar;
