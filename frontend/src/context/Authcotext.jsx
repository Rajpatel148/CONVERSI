import { createContext, useContext, useMemo, useState } from "react";
import {
    deleteMsg,
    getChat,
    getChatlist,
    loginRequest,
    logOutClient,
    sendMsg,
    setAuthToken,
    signUpRequest,
} from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    });

    const [token, setToken] = useState(
        () => localStorage.getItem("token") || null
    );
    // const [loading, setLoading] = useState(false);

    const login = async (data) => {
        try {
            const { token: newToken, user: newUser } = await loginRequest(data);
            if (newToken) {
                setToken(newToken);
                localStorage.setItem("token", newToken);
                setAuthToken(newToken);
            }
            if (newUser) {
                setUser(newUser);
                localStorage.setItem("user", JSON.stringify(newUser));
            }
            return { success: true, newUser, newToken };
        } catch (error) {
            throw error;
        }
    };

    const signUp = async (data) => {
        try {
            const { user: newUser, token: newToken } = await signUpRequest(
                data
            );
            if (newToken) {
                setToken(newToken);
                localStorage.setItem("token", newToken);
                setAuthToken(newToken);
            }
            if (newUser) {
                setUser(newUser);
                localStorage.setItem("user", JSON.stringify(newUser));
            }
            return { success: true, newUser, newToken };
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        logOutClient();
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    const myChatlist = async () => {
        try {
            const res = await getChatlist();
            return res;
        } catch (error) {
            throw error;
        }
    };

    const chat = async (chatId) => {
        // setLoading(true);
        try {
            const res = await getChat(chatId);
            // setLoading(false);
            return res;
        } catch (error) {
            // setLoading(false);
            throw error;
        }
    };

    const send = async (msgData) => {
        try {
            const res = await sendMsg(msgData);
        } catch (error) {
            throw error;
        }
    };

    const deleteMessage = async (msgData) => {
        try {
            const res = await deleteMsg(msgData);
        } catch (error) {
            throw error;
        }
    };

    const uploadAvatar = async (file) => {
        //upload to cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
            "upload_preset",
            `${import.meta.env.VITE_CLOUDINARY_PRESET_NAME}`
        );
        formData.append("cloud_name", `${import.meta.env.VITE_CLOUD_NAME}`);
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${
                    import.meta.env.VITE_CLOUD_NAME
                }/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await response.json();
            console.log(data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error("Error uploading image:", error);
        }
    };
    const contextValue = useMemo(
        () => ({
            user,
            token,
            login,
            logout,
            signUp,
            myChatlist,
            chat,
            send,
            deleteMessage,
            uploadAvatar,
        }),
        [
            user,
            token,
            login,
            logout,
            signUp,
            myChatlist,
            chat,
            send,
            deleteMessage,
            uploadAvatar,
        ]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);
