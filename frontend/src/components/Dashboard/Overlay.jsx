import { Dialog, IconButton } from "@mui/material";
import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ProfileBox from "./Boxes/ProfileBox.jsx";
import SettingsBox from "./Boxes/SettingBox.jsx";
import VideoCallBox from "./Boxes/VideoCallBox.jsx";
import VoiceCallBox from "./Boxes/VoiceCallBox.jsx";
import DeleteBox from "./Boxes/DeleteBox.jsx";
import "./OverLay.css";
import DeleteAccountBox from "./Boxes/DeleteAccountBox.jsx";

// Map overlay types to their corresponding components
const componentsMap = {
    profile: ProfileBox,
    settings: SettingsBox,
    videoCall: VideoCallBox,
    voiceCall: VoiceCallBox,
    deleteOption: DeleteBox,
    deleteAccount: DeleteAccountBox,
};

const OverlayManager = ({ activeBox, onClose }) => {
    if (!activeBox) return null;

    const { type, payload } = activeBox;
    const Component = componentsMap[type];

    // Allow child components (like call boxes) to disable/hide the close button
    const [closeDisabled, setCloseDisabled] = useState(false);

    return (
        <Dialog
            open={true}
            maxWidth="sm"
            // fullWidth
            slotProps={{
                backdrop: {
                    sx: {
                        backgroundColor: "rgba(0,0,0,0.35)",
                        backdropFilter: "blur(4px)",
                    },
                },
            }}
            PaperProps={{
                sx: {
                    position: "relative", // anchor children absolutely
                    borderRadius: 3,
                    overflow: "visible", // allow button outside
                },
            }}
        >
            {/* Close button positioned just outside the box */}
            {!closeDisabled && (
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        top: -18, // just above the box
                        right: -18, // just outside the right edge
                        bgcolor: "#7b7474c2",
                        boxShadow: 2,
                        color: "white",
                        "&:hover": {
                            bgcolor: "#525151ef",
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            )}

            <div className="overlay-container">
                <Component
                    payload={payload}
                    onClose={onClose}
                    setCloseDisabled={setCloseDisabled}
                />
            </div>
        </Dialog>
    );
};

export default OverlayManager;
