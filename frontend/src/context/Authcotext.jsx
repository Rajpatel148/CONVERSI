import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    createNewChat,
    deleteMsg,
    getChat,
    getChatlist,
    getNonFriendList,
    loginRequest,
    logOutClient,
    sendMsg,
    setAuthToken,
    signUpRequest,
} from "../api/axios";
import io from "socket.io-client";
let socket = io(import.meta.env.VITE_BASE_URL);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [chatList, setChatList] = useState([]);
    const [activeChatId, setActiveChatId] = useState("");
    const [sending, setSending] = useState(false);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [nonFriends, setNonFriends] = useState([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const chatData = await myChatlist();
                setChatList(chatData.data);
            } catch (error) {
                console.error("Error fetching chats:", error);
            }
        };

        const fetchNFChats = async () => {
            try {
                const nfData = await nonFriendsList();
                setNonFriends(nfData);
            } catch (error) {
                console.log(error);
            }
        };
        fetchChats();
        fetchNFChats();
    }, []);
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
        try {
            await logOutClient();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
        } catch (error) {
            console.log(error);
        }
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
            return res.data;
        } catch (error) {
            // setLoading(false);
            throw error;
        }
    };

    const createChat = async(data)=>{
        try {
            const response = await createNewChat(data);
            return response.data;
        } catch (error) {
            console.log(error);
        }
    }
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

    const nonFriendsList = async () => {
        try {
            const response = await getNonFriendList();
            return response;
        } catch (error) {
            console.log(error);
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
            socket,
            chatList,
            setChatList,
            activeChatId,
            setActiveChatId,
            sending,
            setSending,
            isOtherUserTyping,
            setIsOtherUserTyping,
            nonFriends,
            setNonFriends,
            createChat,
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
            socket,
            chatList,
            setChatList,
            activeChatId,
            setActiveChatId,
            sending,
            setSending,
            isOtherUserTyping,
            setIsOtherUserTyping,
            nonFriends,
            setNonFriends,
            createChat,
        ]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);
