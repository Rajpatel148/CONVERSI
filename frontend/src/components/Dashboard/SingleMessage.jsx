import { Avatar, Box } from "@mui/material";
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/Authcotext";
import toast from "react-hot-toast";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";

const SingleMessage = ({ msg, fetchChat, msgAvatar }) => {
    const { deleteMessage, user, socket, activeChatId ,setActiveBox} = useAuth();
    let isOwn = msg.senderId === user?._id;
    let formattedTime = "";
    const [isHovered, setIsHovered] = useState(false);
    if (msg.createdAt) {
        const date = new Date(msg.createdAt);
        formattedTime = date.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }); // e.g., "8 Aug, 9:30 PM"
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(msg.text);
            // Optionally show a success message or visual feedback
            alert("Message copied to clipboard!");
        } catch (error) {
            console.log(error);
        }
    };

    const handleDelete = async (msgData) => {
        try {
            // Wrap the deletion request in a toast
            const p = deleteMessage(msgData);

            toast.promise(p, {
                loading: "Deleting...",
                success: "Message deleted",
                error: "Failed to delete",
            });

            await p;

            // Notify the server about the deleted message
            socket.emit("delete-message", {
                ...msgData,
                activeChatId,
            });

            // Refresh chat after deletion
            fetchChat();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Box
            style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-end",
                gap: "1rem",
            }}
            className={isOwn ? "own-message" : "received-message"}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Avatar
                src={isOwn ? user?.avatar : msgAvatar}
                alt={msg.sender?.name || "User Avatar"}
                style={{ width: 30, height: 30 }}
            />
            <div className="chat-content">
                {msg.imageUrl ? (
                    <PhotoProvider maskOpacity={0.8}>
                        <PhotoView src={msg.imageUrl}>
                            <img
                                src={msg.imageUrl}
                                alt="chat-img"
                                style={{
                                    maxWidth: "200px",
                                    maxHeight: "200px",
                                    borderRadius: "4px",
                                    objectFit: "cover",
                                    cursor: "pointer", // Optional: gives user a zoom hint
                                }}
                            />
                        </PhotoView>
                    </PhotoProvider>
                ) : (
                    <p>{msg.text}</p>
                )}
                <span
                    className="timestamp"
                    style={{
                        color: isOwn ? "#ffffff86" : "#0000007c",
                    }}
                >
                    {formattedTime}
                </span>
            </div>
            {isHovered && (
                <div className="chat-tools">
                    {!msg.imageUrl && (
                        <button onClick={handleCopy}>
                            <Copy size={15} />
                        </button>
                    )}
                    {isOwn && (
                        <button
                            onClick={() =>
                                handleDelete({
                                    messageId: msg._id,
                                    userIds: [user._id],
                                })
                            }
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            )}
        </Box>
    );
};

export default SingleMessage;
