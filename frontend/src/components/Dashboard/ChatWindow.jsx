import React, { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import "./ChatWindow.css";
import { Box, Skeleton } from "@mui/material";
import { Paperclip, Send, Smile } from "lucide-react";
import { useAuth } from "../../context/Authcotext";
import SingleMessage from "./SingleMessage";
import EmojiPicker from "emoji-picker-react";
import { useRef } from "react";
import toast from "react-hot-toast";
import ChatAreaSkeleton from "../Skeleton/SkeletonChatArea";

const ChatWindow = () => {
    const {
        chat,
        send,
        socket,
        user,
        uploadAvatar,
        sending,
        setSending,
        activeChatId: chatId,
        chatList,
        setChatList,
        setIsOtherUserTyping,
        nonFriends,
    } = useAuth();

    // Fetch chat data
    const [chatData, setChatData] = useState(null);
    const fetchChat = async () => {
        try {
            const response = await chat(chatId);
            setChatData(response);
        } catch (error) {
            setChatData(null);
        }
    };
    useEffect(() => {
        if (!chatId) return;
        setChatData(null);
        fetchChat();
    }, [chatId]);
    const isChatLoading = chatData == null;

    // Message input state
    const [message, setMessage] = useState("");
    const [typing, settyping] = useState(false);
    const currentChatUser =
        chatList?.find((c) => c._id === chatId) ||
        nonFriends.filter((nf) => nf._id == chatId)[0];
    const [emojisVisible, setEmojisVisible] = useState(false);
    const prevChatIdRef = useRef(null);

    // Scroll to bottom on new message
    const messagesEndRef = useRef(null);
    useEffect(() => {
        scrollToBottom();
    }, [chatData]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // DEfine socket events
    useEffect(() => {
        if (!socket || !chatId) return;

        // leave the previous room
        if (prevChatIdRef.current && prevChatIdRef.current !== chatId) {
            socket.emit("leave-chat", prevChatIdRef.current);
        }

        // join the current room
        socket.emit("join-chat", { roomId: chatId, userId: user._id });

        // listeners
        const onNewMsgNotif = async () => {};
        const onUserJoined = (userId) => {
            setChatData((prev) => {
                if (!Array.isArray(prev)) return prev;
                const updated = prev.map((msg) => {
                    if (msg.senderId === user._id && userId !== user._id) {
                        const seenArr = Array.isArray(msg.seenBy)
                            ? [...msg.seenBy]
                            : [];
                        const index = seenArr.findIndex(
                            (seen) => seen.user === userId
                        );
                        if (index === -1) {
                            seenArr.push({ user: userId, seenAt: new Date() });
                        }
                        return { ...msg, seenBy: seenArr };
                    }
                    return msg;
                });
                return updated;
            });
        };
        const onTyping = (data) => {
            if (data.typer !== user._id) setIsOtherUserTyping(true);
        };
        const onStopTyping = (data) => {
            if (data.typer !== user._id) setIsOtherUserTyping(false);
        };
        const onReceiveMessage = (data) => {
            // 1. Update chatData
            setChatData((prev) => {
                if (!prev) return [data];
                if (prev.find((msg) => msg._id === data._id)) return prev;
                return [...prev, data];
            });

            // 2. Update latest message in chatList
            setChatList((prevChats) =>
                prevChats.map((c) =>
                    c._id === data.chatId
                        ? {
                              ...c,
                              latestMsg: data.text ? data.text : "📷 Image",
                          }
                        : c
                )
            );

            // 3. Scroll to bottom
            scrollToBottom();
        };
        const onMessageDeleted = ({ messageId }) => {
            setChatData((prev) =>
                Array.isArray(prev)
                    ? prev.filter((m) => m._id !== messageId)
                    : prev
            );
        };

        socket.on("new-message-notification", onNewMsgNotif);
        socket.on("user-joined-room", onUserJoined);
        socket.on("typing", onTyping);
        socket.on("stop-typing", onStopTyping);
        socket.on("receive-message", onReceiveMessage);
        socket.on("message-deleted", onMessageDeleted);

        prevChatIdRef.current = chatId;
        return () => {
            socket.off("new-message-notification", onNewMsgNotif);
            socket.off("user-joined-room", onUserJoined);
            socket.off("typing", onTyping);
            socket.off("stop-typing", onStopTyping);
            socket.off("receive-message", onReceiveMessage);
            socket.off("message-deleted", onMessageDeleted);
        };
    }, [socket, chatId, user._id, setIsOtherUserTyping, setChatList]);

    const handleSend = async () => {
        if (!message.trim()) return;
        setSending(true);
        try {
            // Send the message
            const sendedMsg = await send({
                chatId,
                text: message,
                senderId: user?._id,
            });

            // Optimistically update chat UI
            setChatData((prev) => [...(prev || []), sendedMsg]);

            // Notify server
            socket.emit("send-message", chatId);

            setMessage("");
            scrollToBottom();
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setSending(false);
        }
    };

    const handleEmojiClick = (emojiData, event) => {
        setMessage((prev) => prev + emojiData.emoji);
        setEmojisVisible(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSending(true);
        try {
            const imageUrl = await uploadAvatar(file);
            if (!imageUrl) throw new Error();
            const sendedMsg = await send({
                chatId,
                imageUrl,
                senderId: user._id,
            });
            // Optimistically update local state for sender
            setChatData((prev) => [...(prev || []), sendedMsg]);

            // Tell server to broadcast
            socket.emit("send-message", chatId);

            scrollToBottom();
        } catch (error) {
            // Optionally show error
            console.log(error);
        }
        setSending(false);
    };

    const handleTyping = () => {
        if (message === "" && typing) {
            settyping(false);
            socket.emit("stop-typing", {
                typer: user._id,
                chatId,
            });
        } else if (message !== "" && !typing) {
            settyping(true);
            socket.emit("typing", {
                typer: user._id,
                chatId,
            });
        }
    };

    return (
        <div className="chat-window">
            {/* Chat Header */}
            {currentChatUser ? (
                <ChatHeader key={chatId} data={currentChatUser} />
            ) : (
                <div
                    className="chat-window-header"
                    style={{ padding: "0.75rem 1rem" }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                        }}
                    >
                        <Skeleton variant="circular" width={50} height={50} />
                        <div style={{ flex: 1 }}>
                            <Skeleton variant="text" height={22} width="40%" />
                            <Skeleton variant="text" height={16} width="20%" />
                        </div>
                       </div>
                </div>
            )}

            {/* Chat */}
            <Box
                className="chat-box"
                id="chat-box"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {isChatLoading ? (
                    <ChatAreaSkeleton />
                ) : Array.isArray(chatData) && chatData.length > 0 ? (
                    chatData.map((msg) => {
                        return (
                            <SingleMessage
                                key={msg._id || msg.id}
                                msg={msg}
                                fetchChat={fetchChat}
                                msgAvatar={currentChatUser?.members?.[0]?.avatar}
                            />
                        );
                    })
                ) : (
                    <p style={{ color: "#888", textAlign: "center" }}>
                        No messages yet.
                    </p>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input field */}
            <div className="chat-input">
                <label className="attach-button" disabled={sending}>
                    <Paperclip
                        size={22}
                        color={sending ? "#aaa" : "rgb(75 ,165 ,75)"}
                        style={{
                            cursor: sending ? "not-allowed" : "pointer",
                        }}
                    />
                    <input
                        type="file"
                        disabled={sending}
                        onChange={handleImageUpload}
                        hidden
                    />
                </label>
                <div className="input-div">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="message-input"
                        value={message}
                        onChange={(e) => {
                            setMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !sending) handleSend();
                        }}
                        disabled={sending}
                    />
                    <button
                        type="button"
                        disabled={sending}
                        onClick={() => setEmojisVisible(!emojisVisible)}
                        style={{
                            cursor: sending ? "not-allowed" : "pointer",
                        }}
                    >
                        <Smile color={sending ? "#aaa" : "rgb(75 ,165 ,75)"} />
                    </button>
                </div>
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                        background: sending ? "#ddd" : "rgb(75, 165, 75)",
                        color: sending ? "#aaa" : "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1.2rem",
                        fontWeight: 600,
                        fontSize: "1rem",
                        cursor: sending ? "not-allowed" : "pointer",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        transition: "background 0.2s",
                    }}
                >
                    {sending ? (
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 50 50"
                                style={{ marginRight: "4px" }}
                            >
                                <circle
                                    cx="25"
                                    cy="25"
                                    r="20"
                                    fill="none"
                                    stroke="rgb(75, 165, 75)"
                                    strokeWidth="5"
                                    strokeDasharray="31.4 31.4"
                                    strokeLinecap="round"
                                >
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 25 25"
                                        to="360 25 25"
                                        dur="0.8s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            </svg>
                            Sending...
                        </span>
                    ) : (
                        <>
                            <Send /> Send
                        </>
                    )}
                </button>
            </div>

            {/* Emoji picker - Optional, can be implemented later */}
            {emojisVisible && (
                <div
                    className="emoji-picker"
                    style={{
                        position: "absolute",
                        bottom: "60px",
                        right: "20px",
                        transition: "all 0.3s ease-in-out",
                    }}
                >
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        style={{
                            backgroundColor: "#f9f9f9",
                            boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
                            borderRadius: "10px",
                            height: "400px",
                            width: "300px",
                            zIndex: 1000,
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
