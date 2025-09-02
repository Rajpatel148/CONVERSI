import React, { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import "./ChatWindow.css";
import { Avatar, Box } from "@mui/material";
import { Paperclip, Send, Smile } from "lucide-react";
import { useAuth } from "../../context/Authcotext";
import SingleMessage from "./SingleMessage.jsx/";

const ChatWindow = ({ chatId, chatUser }) => {
    const { chat, send, user } = useAuth();
    const [chatData, setChatData] = useState(null);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const currentChatUser = chatUser?.find((c) => c._id === chatId);

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
                <button className="attach-button" disabled={sending}>
                    <Paperclip size={22} />
                </button>
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
                    <button type="button" disabled={sending}>
                        <Smile />
                    </button>
                </div>
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={sending}
                >
                    <Send />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
