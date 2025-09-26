import React from "react";
import "./Profile.css"; // custom CSS for styling
import { Avatar, Typography, IconButton } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useAuth } from "../../../context/Authcotext";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";


const ProfileBox = ({ payload }) => {
    const { setActiveBox } = useAuth();

    const { name, username, status, avatar, isMe } = payload || {};
    return (
        <div className="profile-box">
            {/* Avatar */}
            <PhotoProvider maskOpacity={0.8}>
                <PhotoView src={avatar}>
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
                </PhotoView>
            </PhotoProvider>

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
                    <span>Status:</span> {status}
                </Typography>
            </div>

            {/* Call Actions */}
            {!isMe && (
                <div className="profile-actions">
                    <IconButton
                        className="call-btn voice"
                        disabled={status !== "Online"}
                        onClick={() =>
                            setActiveBox({
                                type: "voiceCall",
                                // VoiceCallBox expects payload.user with _id
                                payload: { user: payload },
                            })
                        }
                    >
                        <PhoneIcon fontSize="large" />
                    </IconButton>
                    <IconButton
                        className="call-btn video"
                        disabled={status !== "Online"}
                        onClick={() =>
                            setActiveBox({
                                type: "videoCall",
                                payload: { user: payload },
                            })
                        }
                    >
                        <VideocamIcon fontSize="large" />
                    </IconButton>
                </div>
            )}
        </div>
    );
};

export default ProfileBox;
