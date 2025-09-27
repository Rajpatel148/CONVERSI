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
import TypingIndicator from "./TypingIndicator";

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
            // Sync sidebar latest preview with actual last visible message
            try {
                const last = Array.isArray(response)
                    ? response[response.length - 1]
                    : null;
                const preview = last
                    ? last.text
                        ? last.text
                        : last.imageUrl
                        ? "📷 Image"
                        : ""
                    : "";
                setChatList((prev) =>
                    Array.isArray(prev)
                        ? prev.map((c) =>
                              c._id === chatId
                                  ? { ...c, latestMsg: preview }
                                  : c
                          )
                        : prev
                );
            } catch {}
            // After loading messages, clear unread counts locally
            setChatList((prev) => {
                if (!Array.isArray(prev)) return prev;
                return prev.map((c) => {
                    if (c._id !== chatId) return c;
                    const updatedUC = (c.unreadCounts || []).map((uc) => {
                        const uid = uc.userId?._id || uc.userId;
                        if (uid === user._id) return { ...uc, count: 0 };
                        return uc;
                    });
                    return { ...c, unreadCounts: updatedUC };
                });
            });
        } catch (error) {
            setChatData(null);
        }
    };
    useEffect(() => {
        if (!chatId) return;
        fetchChat();
    }, [chatId]);
    const isChatLoading = chatData == null;

    // Message input state
    const [message, setMessage] = useState("");
    const [typing, settyping] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false); // show indicator for other user only
    const otherTypingTimerRef = useRef(null);
    const selfTypingIdleTimerRef = useRef(null); // emits stop-typing if we pause
    const currentChatUser =
        chatList?.find((c) => c._id === chatId) ||
        nonFriends.filter((nf) => nf._id == chatId)[0];
    const [emojisVisible, setEmojisVisible] = useState(false);
    const prevChatIdRef = useRef(null);
    const inputRef = useRef(null);

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
        // Optimistically clear unread for this chat locally
        setChatList((prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((c) => {
                if (c._id !== chatId) return c;
                const updatedUC = (c.unreadCounts || []).map((uc) => {
                    const uid = uc.userId?._id || uc.userId;
                    if (uid === user._id) return { ...uc, count: 0 };
                    return uc;
                });
                return { ...c, unreadCounts: updatedUC };
            });
        });

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
            if (!data || data.typer === user._id || data.chatId !== chatId)
                return;
            setIsOtherUserTyping(true);
            setOtherTyping(true);
            // ensure the indicator is visible to the user
            scrollToBottom();
            // auto-hide after inactivity
            if (otherTypingTimerRef.current)
                clearTimeout(otherTypingTimerRef.current);
            otherTypingTimerRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
                setOtherTyping(false);
            }, 7000); //!chage it
        };
        const onStopTyping = (data) => {
            if (!data || data.typer === user._id || data.chatId !== chatId)
                return;
            setIsOtherUserTyping(false);
            setOtherTyping(false);
            if (otherTypingTimerRef.current) {
                clearTimeout(otherTypingTimerRef.current);
                otherTypingTimerRef.current = null;
            }
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

            // 2.5 If message is from other user, hide typing indicator
            try {
                const senderId = data?.senderId?._id || data?.senderId;
                if (senderId && senderId !== user._id) {
                    setOtherTyping(false);
                    setIsOtherUserTyping(false);
                    if (otherTypingTimerRef.current) {
                        clearTimeout(otherTypingTimerRef.current);
                        otherTypingTimerRef.current = null;
                    }
                }
            } catch {}

            // 3. Scroll to bottom
            scrollToBottom();
        };
        const onMessageDeleted = ({ messageId, chatId: evtChatId }) => {
            // Only handle for the current chat
            if (evtChatId && evtChatId !== chatId) return;
            setChatData((prev) => {
                if (!Array.isArray(prev)) return prev;
                const updated = prev.filter((m) => m._id !== messageId);
                // Recalculate latest message preview for sidebar
                const last = updated[updated.length - 1];
                const preview = last
                    ? last.text
                        ? last.text
                        : last.imageUrl
                        ? "📷 Image"
                        : ""
                    : "";
                setChatList((prevChats) =>
                    Array.isArray(prevChats)
                        ? prevChats.map((c) =>
                              c._id === chatId
                                  ? { ...c, latestMsg: preview }
                                  : c
                          )
                        : prevChats
                );
                return updated;
            });
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
            // ensure remote indicator is cleared when leaving chat
            try {
                socket.emit("stop-typing", { typer: user._id, chatId });
            } catch {}
            setOtherTyping(false);
            setIsOtherUserTyping(false);
            if (otherTypingTimerRef.current) {
                clearTimeout(otherTypingTimerRef.current);
                otherTypingTimerRef.current = null;
            }
            if (selfTypingIdleTimerRef.current) {
                clearTimeout(selfTypingIdleTimerRef.current);
                selfTypingIdleTimerRef.current = null;
            }
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
            // stop typing once message is sent
            if (typing) {
                settyping(false);
                socket.emit("stop-typing", { typer: user._id, chatId });
            }
            // Keep typing focus in the input after sending
            inputRef.current?.focus();
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
        // Return focus to input after picking emoji
        inputRef.current?.focus();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type || !file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            // reset file input so user can re-select
            e.target.value = "";
            inputRef.current?.focus();
            return;
        }
        setSending(true);
        try {
            const imageUrl = await uploadAvatar(file);
            if (!imageUrl) throw new Error("Upload failed");
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
            // Keep focus on input after upload send
            inputRef.current?.focus();
        } catch (error) {
            console.log(error);
        } finally {
            setSending(false);
            // clear file input selection after handling
            if (e?.target) e.target.value = "";
        }
    };

    const handleTyping = (nextVal) => {
        // reset idle timer on every keystroke
        if (selfTypingIdleTimerRef.current) {
            clearTimeout(selfTypingIdleTimerRef.current);
        }
        selfTypingIdleTimerRef.current = setTimeout(() => {
            if (typing) {
                settyping(false);
                socket.emit("stop-typing", { typer: user._id, chatId });
            }
        }, 7000); //!chage it

        const valueEmpty = (nextVal ?? message) === "";
        if (valueEmpty && typing) {
            settyping(false);
            socket.emit("stop-typing", {
                typer: user._id,
                chatId,
            });
        } else if (!valueEmpty && !typing) {
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
                                msgAvatar={
                                    currentChatUser?.members?.[0]?.avatar
                                }
                            />
                        );
                    })
                ) : (
                    <p style={{ color: "#888", textAlign: "center" }}>
                        No messages yet.
                    </p>
                )}
                {otherTyping && (
                    <TypingIndicator
                        avatarSrc={currentChatUser?.members?.[0]?.avatar}
                    />
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
                        accept="image/*"
                        disabled={sending}
                        onChange={handleImageUpload}
                        hidden
                    />
                </label>
                <div className="input-div">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        className="message-input"
                        value={message}
                        onChange={(e) => {
                            const v = e.target.value;
                            setMessage(v);
                            handleTyping(v);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !sending) handleSend();
                        }}
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
