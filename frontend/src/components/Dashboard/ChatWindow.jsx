import React, { useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import "./ChatWindow.css";
import { Avatar, Box } from "@mui/material";
import { Paperclip, Send, Smile } from "lucide-react";
import { useAuth } from "../../context/Authcotext";

const ChatWindow = ({ chatId }) => {
    const { chat } = useAuth();
    const [chatData, setChatData] = useState(null);

    useEffect(() => {
        if (!chatId) return;
        const fetchChat = async () => {
            try {
                const response = await chat(chatId);
                
                setChatData(response);
            } catch (error) {
                setChatData(null);
            }
        };
        fetchChat();
    }, [chatId]);

    return (
        <div className="chat-window">
            {/* Chat Header */}
            <ChatHeader data={chatData} />

            {/* Chat */}
            <Box
                className="chat-box"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {/* {chatData.map((msg) => (
                    <Box
                        key={msg.id}
                        style={{
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "flex-end",
                            gap: "1rem",
                        }}
                        className={
                            msg.isOwn ? "own-message" : "received-message"
                        }
                    >
                        <Avatar
                            src={msg.sender.avatar} //!MArketing Image
                            alt={msg.sender.name}
                            style={{ width: 30, height: 30 }}
                        />
                        <div className="chat-content">
                            <p>{msg.content}</p>
                            <span
                                className="timestamp"
                                style={{
                                    color: msg.isOwn
                                        ? "#ffffff86"
                                        : "#0000007c",
                                }}
                            >
                                {msg.timestamp}
                            </span>
                        </div>
                    </Box>
                ))} */}
            </Box>

            {/* Input field */}
            <div className="chat-input">
                <button className="attach-button">
                    <Paperclip size={22} />
                </button>
                <div className="input-div">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="message-input"
                    />
                    <button>
                        <Smile />
                    </button>
                </div>
                <button className="send-button">
                    <Send />
                </button>
            </div>
        </div>
    );
};

export default ChatWindow;
