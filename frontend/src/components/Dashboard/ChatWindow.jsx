import React from "react";
import ChatHeader from "./ChatHeader";
import "./ChatWindow.css";
import { Avatar, Box } from "@mui/material";
import { Paperclip, Send, Smile } from "lucide-react";

const ChatWindow = ({ chatId }) => {
    const selectedChat = {
        id: chatId,
        name: "Jane Doe",
        avatar: "demo.jpeg",
    };
    const data = [
        {
            id: "1",
            content: "Hey! How are you doing today?",
            timestamp: "10:30 AM",
            sender: {
                id: selectedChat.id,
                name: selectedChat.name,
                avatar: selectedChat.avatar,
            },
            isOwn: false,
        },
        {
            id: "2",
            content:
                "I'm doing great! Just working on some new designs. How about you?",
            timestamp: "10:32 AM",
            sender: {
                id: "me",
                name: "You",
                avatar: "/abstract-geometric-shapes.png",
            },
            isOwn: true,
        },
        {
            id: "3",
            content:
                "That sounds awesome! I'd love to see what you're working on when you get a chance.",
            timestamp: "10:35 AM",
            sender: {
                id: selectedChat.id,
                name: selectedChat.name,
                avatar: selectedChat.avatar,
            },
            isOwn: false,
        },
        {
            id: "4",
            content:
                "Sure thing! I'll send over a few screenshots later today.",
            timestamp: "10:36 AM",
            sender: {
                id: "me",
                name: "You",
                avatar: "/abstract-geometric-shapes.png",
            },
            isOwn: true,
        },
        {
            id: "5",
            content:
                "By the way, have you checked the latest updates from the dev team?",
            timestamp: "10:38 AM",
            sender: {
                id: selectedChat.id,
                name: selectedChat.name,
                avatar: selectedChat.avatar,
            },
            isOwn: false,
        },
        {
            id: "6",
            content: "Not yet. Did they finally fix that deployment bug?",
            timestamp: "10:39 AM",
            sender: {
                id: "me",
                name: "You",
                avatar: "/abstract-geometric-shapes.png",
            },
            isOwn: true,
        },
        {
            id: "7",
            content: "Yes! And the new CI/CD pipeline is much faster now.",
            timestamp: "10:41 AM",
            sender: {
                id: selectedChat.id,
                name: selectedChat.name,
                avatar: selectedChat.avatar,
            },
            isOwn: false,
        },
        {
            id: "8",
            content:
                "That's amazing. It'll save us a lot of time on test builds.",
            timestamp: "10:42 AM",
            sender: {
                id: "me",
                name: "You",
                avatar: "/abstract-geometric-shapes.png",
            },
            isOwn: true,
        },
        {
            id: "9",
            content: "Absolutely. Also, are you joining the team call at 11?",
            timestamp: "10:43 AM",
            sender: {
                id: selectedChat.id,
                name: selectedChat.name,
                avatar: selectedChat.avatar,
            },
            isOwn: false,
        },
        {
            id: "10",
            content: "Yes, I’ll be there. Just wrapping up a few things first.",
            timestamp: "10:44 AM",
            sender: {
                id: "me",
                name: "You",
                avatar: "/abstract-geometric-shapes.png",
            },
            isOwn: true,
        },
    ];

    return (
        <div className="chat-window">
            {/* Chat Header */}
            <ChatHeader data={data} />

            {/* Chat */}
            <Box
                className="chat-box"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {data.map((msg) => (
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
                ))}
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
