import "./DeleteAccount.css";
import React, { useState } from "react";
import { useAuth } from "../../../context/Authcotext";
import { useNavigate } from "react-router-dom";

const DeleteAccountBox = ({ payload, onClose }) => {
    const [inputValue, setInputValue] = useState("");
    const { deleteAccount } = useAuth();
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (inputValue !== "DELETE") return;
        try {
            const res = await deleteAccount();
            if (res?.success && typeof onClose === "function") {
                onClose();
                navigate("/");
            }
        } catch (e) {
            // toast handled in context
            console.error("Delete Account Error:", e.message);
        }
    };

    return (
        <div className="delete-account-container">
            <h2>Delete Account</h2>
            <p>
                Deleting your account will remove all of your information from
                our database. <strong>This cannot be undone.</strong>
            </p>

            <label htmlFor="confirmInput">To confirm this, type “DELETE”</label>
            <input
                id="confirmInput"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type DELETE here"
            />

            <button
                className="delete-button"
                disabled={inputValue !== "DELETE"}
                onClick={handleDelete}
            >
                Delete Account
            </button>
        </div>
    );
};

export default DeleteAccountBox;
