import React, { useRef, useState } from "react";
import { useAuth } from "../../../context/Authcotext";
import "./Profile.css";
import { ImagePlus } from "lucide-react";

const EditProfileBox = ({ payload, onClose }) => {
    const {
        user,
        uploadAvatar,
        changeAvatarProfile,
        updateAccount,
        setActiveBox,
    } = useAuth();
    const [fullname, setFullname] = useState(user?.fullname || "");
    const [username, setUsername] = useState(user?.username || "");
    const [status] = useState("Online");
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
    const fileInputRef = useRef(null);

    const onPickAvatar = () => fileInputRef.current?.click();

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const url = await uploadAvatar(file);
            setAvatarPreview(url);
            await changeAvatarProfile({ avatar: url });
        } catch {}
    };

    const onCancel = () => {
        setActiveBox({ type: "profile", payload: { ...payload, isMe: true } });
    };

    const onSave = async () => {
        const res = await updateAccount({ fullname, username });
        if (res?.success) {
            setActiveBox({
                type: "profile",
                payload: { ...payload, isMe: true },
            });
               if (typeof onClose === "function") onClose();
        }
    };

    return (
        <div className="profile-edit-box">
            <h2 className="edit-title">Edit Profile</h2>

            <div className="edit-avatar-wrap">
                <div className="edit-avatar" onClick={onPickAvatar}>
                    {avatarPreview ? (
                        <img src={avatarPreview} alt={fullname} />
                    ) : (
                        <div className="avatar-placeholder" />
                    )}
                    <button className="avatar-camera" onClick={onPickAvatar}>
                        <ImagePlus size={32}/>
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        ref={fileInputRef}
                        onChange={onFileChange}
                    />
                </div>
            </div>

            <div className="edit-fields">
                <label>Name</label>
                <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="Your name"
                />

                <label>Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                />

                <div className="status-row">
                    <span className="status-label">Status:</span>
                    <span className="status-value">{status}</span>
                </div>
            </div>

            <div className="edit-actions">
                <button className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
                <button className="btn btn-primary" onClick={onSave}>
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default EditProfileBox;
