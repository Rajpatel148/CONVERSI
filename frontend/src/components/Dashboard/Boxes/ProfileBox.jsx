import React from "react";
import "./Profile.css"; // custom CSS for styling
import { Avatar, Typography, IconButton } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import VideocamIcon from "@mui/icons-material/Videocam";


const ProfileBox = ({ payload }) => {
    const {
        name,
        username,
        status,
        avatar,
    } = payload || {};
    return (
        <div className="profile-box">
            {/* Avatar */}
            <Avatar
                src={avatar}
                alt={name}
                className="profile-avatar"
                style={{
                    border:
                        status === "Online"
                            ? "4px solid #4caf50"
                            : "4px solid gray",
                }}
            />

            {/* Info */}
            <div className="profile-info">
                <Typography variant="body1" className="profile-field">
                    <span>Name:</span> {name}
                </Typography>
                <Typography variant="body1" className="profile-field">
                    <span>Username:</span> {username}
                </Typography>
                <Typography
                    variant="body1"
                    className="profile-field"
                    style={{ color: status === "Online" ? "#388e3c" : "gray" }}
                >
                    <span>Status:</span>{" "}
                    {status}
                </Typography>
            </div>

            {/* Call Actions */}
            <div className="profile-actions">
                <IconButton className="call-btn voice">
                    <PhoneIcon fontSize="large" />
                </IconButton>
                <IconButton className="call-btn video">
                    <VideocamIcon fontSize="large" />
                </IconButton>
            </div>
        </div>
    );
};

export default ProfileBox;
