import { Avatar, Box } from "@mui/material";
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/Authcotext";

const SingleMessage = ({ msg, user, fetchChat }) => {
    const { deleteMessage } = useAuth();
    let isOwn = msg.senderId === user?._id;
    let formattedTime = "";
    const [isHpovered, setIsHovered] = useState(false);

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
            const res = await deleteMessage(msgData);
            fetchChat();
        } catch (error) {
            // Optionally show error
            console.log(error);
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
                src={msg.sender?.avatar || null}
                alt={msg.sender?.name || "User Avatar"}
                style={{ width: 30, height: 30 }}
            />
            <div className="chat-content">
                <p>{msg.text}</p>
                <span
                    className="timestamp"
                    style={{
                        color: isOwn ? "#ffffff86" : "#0000007c",
                    }}
                >
                    {formattedTime}
                </span>
            </div>
            {isHpovered && (
                <div className="chat-tools">
                    <button onClick={handleCopy}>
                        <Copy size={15} />
                    </button>
                    {isOwn && (
                        <button
                            onClick={() =>
                                handleDelete({
                                    messageId: msg._id,
                                    userIds: [user._id], // <-- send as array
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
