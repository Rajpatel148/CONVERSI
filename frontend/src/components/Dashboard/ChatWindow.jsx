import React, { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import "./ChatWindow.css";
import { Avatar, Box } from "@mui/material";
import { Paperclip, Send, Smile } from "lucide-react";
import { useAuth } from "../../context/Authcotext";
import SingleMessage from "./SingleMessage.jsx/";
import EmojiPicker from "emoji-picker-react";
import Button from "@mui/material/Button";

const ChatWindow = ({ chatId, chatUser }) => {
    const { chat, send, user, uploadAvatar } = useAuth();
    const [chatData, setChatData] = useState(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const currentChatUser = chatUser?.find((c) => c._id === chatId);
    const [emojisVisible, setEmojisVisible] = useState(false);

    const fetchChat = async () => {
        try {
            const response = await chat(chatId);
            setChatData(response.data);
        } catch (error) {
            setChatData(null);
        }
    };
    useEffect(() => {
        if (!chatId) return;
        fetchChat();
    }, [chatId]);

    const handleSend = async () => {
        if (!message.trim()) return;
        setSending(true);
        try {
            await send({
                chatId,
                text: message,
                senderId: user?._id,
            });
            setMessage("");
            fetchChat();
        } catch (error) {
            // Optionally show error
        }
        setSending(false);
    };

    const handleEmojiClick = (emojiData, event) => {
        setMessage((prev) => prev + emojiData.emoji);
        setEmojisVisible(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSending(true);
        const imageUrl = await uploadAvatar(file);
        try {
            await send({
                chatId,
                imageUrl,
                senderId: user._id,
            });
        } catch (error) {
            // Optionally show error
            console.log(error);
        }
        fetchChat();
        setSending(false);
    };
    return (
        <div className="chat-window">
            {/* Chat Header */}
            <ChatHeader data={currentChatUser} />

            {/* Chat */}
            <Box
                className="chat-box"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {Array.isArray(chatData) && chatData.length > 0 ? (
                    chatData.map((msg) => {
                        return (
                            <SingleMessage
                                key={msg._id || msg.id}
                                msg={msg}
                                user={user}
                                fetchChat={fetchChat}
                            />
                        );
                    })
                ) : (
                    <p style={{ color: "#888", textAlign: "center" }}>
                        No messages yet.
                    </p>
                )}
            </Box>

            {/* Input field */}
            <div className="chat-input">
                <label className="attach-button" disabled={sending}>
                    <Paperclip
                        size={22}
                        color={sending ? "#aaa" : "rgb(75 ,165 ,75)"}
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
                        onChange={(e) => setMessage(e.target.value)}
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
                                    stroke="#fff"
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
