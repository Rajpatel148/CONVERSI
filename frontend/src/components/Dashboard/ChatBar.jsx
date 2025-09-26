import Avatar from "@mui/material/Avatar";
import { useAuth } from "../../context/Authcotext";

const ChatBar = ({ chatUserData }) => {
    const { user, activeChatId, setActiveChatId, socket } = useAuth();
    const isGroup = chatUserData?.isGroup;
    const name = isGroup
        ? chatUserData?.name || "Unnamed Group"
        : chatUserData?.members?.[0]?.fullname || "Unknown User";

    const avatarSrc = chatUserData?.members?.[0]?.avatar || "";
    const latestMsg = chatUserData?.latestMsg || "No messages yet";
    const unreadCount = Array.isArray(chatUserData?.unreadCounts)
        ? chatUserData.unreadCounts.find(
              (u) => (u.userId?._id || u.userId) === user?._id
          )?.count || 0
        : 0;

    // Handleopen
    const handleChatOpen = async () => {
        try {
            await socket.emit("stop-typing", {
                typer: user._id,
                chatId: activeChatId,
            });

            await socket.emit("leave-chat", activeChatId);
            setActiveChatId(chatUserData._id);
        } catch (error) {
            console.log(error);
        }
    };
    return (
        <div
            className="chat-bar"
            onClick={handleChatOpen}
            style={{
                backgroundColor:
                    activeChatId === chatUserData._id &&
                    "rgba(10, 153, 67, 0.578)",
                cursor: "pointer",
            }}
        >
            <div className="chat-bar-avatar">
                <Avatar
                    src={avatarSrc}
                    alt={name}
                    sx={{
                        width: "56px",
                        height: "56px",
                        objectFit: "cover",
                    }}
                />
            </div>
            <div className="chat-bar-info">
                <div className="info-top">{name}</div>
                <div className="info-bottom">
                    <p>{latestMsg}</p>
                    {unreadCount > 0 && (
                        <div className="unread-badge">{unreadCount}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatBar;
