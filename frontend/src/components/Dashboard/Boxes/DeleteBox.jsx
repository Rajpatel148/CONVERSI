import React, { useMemo } from "react";
import { useAuth } from "../../../context/Authcotext";
import "./Delete.css";

// Confirmation modal content for deleting a message
// payload expected: { messageId: string, userIds?: string[], senderId?: string }
const DeleteBox = ({ payload, onClose }) => {
    const { user, chatList, activeChatId, deleteMessage, socket } = useAuth();

    const canDeleteForEveryone = useMemo(() => {
        if (!payload || !user) return false;
        return payload.senderId === user._id; // only sender can delete for everyone
    }, [payload, user]);

    const getMemberIdsOfActiveChat = () => {
        const chat = Array.isArray(chatList)
            ? chatList.find((c) => c._id === activeChatId)
            : null;
        if (!chat) return [];
        // members can be ids or populated docs
        return (chat.members || []).map((m) => (m?._id ? m._id : m));
    };

    const handleDeleteForMe = async () => {
        if (!payload?.messageId || !user?._id) return;
        try {
            // Persist deletion for me only
            await deleteMessage({
                messageId: payload.messageId,
                userIds: [user._id],
            });
            // Ask server to emit back just to my personal room so UI prunes locally
            socket.emit("delete-message", {
                messageId: payload.messageId,
                userIDS: [user._id],
                chatId: activeChatId,
            });
        } finally {
            onClose?.();
        }
    };

    const handleDeleteForEveryone = async () => {
        const memberIds = getMemberIdsOfActiveChat();
        if (!payload?.messageId || memberIds.length === 0) return;
        try {
            // Persist deletion for all participants
            await deleteMessage({
                messageId: payload.messageId,
                userIds: memberIds,
            });
            // Ask server to broadcast to the room
            socket.emit("delete-message", {
                messageId: payload.messageId,
                userIDS: memberIds,
                chatId: activeChatId,
            });
        } finally {
            onClose?.();
        }
    };

    return (
        <div className="delete-dialog-container">
            {/* Header */}
            <div className="delete-dialog-header">
                <p>Delete Message</p>
            </div>

            {/* Message */}
            <div className="delete-dialog-body">
                <p>
                    Proof! This message could disappear forever.{" "}
                    <b>Choose your weapon.</b>
                </p>
            </div>

            <div className="delete-dialog-divider"></div>

            {/* Actions */}
            <div className="delete-dialog-actions">
                <button className="btn delete-me" onClick={handleDeleteForMe}>
                    Delete for me
                </button>
                {canDeleteForEveryone && (
                    <button
                        className="btn delete-everyone"
                        onClick={handleDeleteForEveryone}
                    >
                        Delete for everyone
                    </button>
                )}
            </div>
        </div>
    );
};

export default DeleteBox;
