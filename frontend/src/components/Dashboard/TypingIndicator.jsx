import React from "react";
import Avatar from "@mui/material/Avatar";

const TypingIndicator = ({ avatarSrc = "" }) => {
    return (
        <div className="typing-indicator-wrapper">
            <Avatar
                src={avatarSrc}
                alt="User Avatar"
                style={{ width: 30, height: 30 }}
            />
            <div className="typing">
                <span className="typing__dot" />
                <span className="typing__dot" />
                <span className="typing__dot" />
            </div>
        </div>
    );
};

export default TypingIndicator;
