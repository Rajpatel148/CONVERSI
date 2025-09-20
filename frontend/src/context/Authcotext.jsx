import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, {
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
import toast from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const socket = useMemo(
        () =>
            io(import.meta.env.VITE_BASE_URL, {
                transports: ["websocket"],
                withCredentials: true,
            }),
        []
    );

    const [token, setToken] = useState(
        () => localStorage.getItem("token") || null
    );
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const [chatList, setChatList] = useState([]);
    const [activeChatId, setActiveChatId] = useState("");
    const [sending, setSending] = useState(false);
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [nonFriends, setNonFriends] = useState([]);

    useEffect(() => {
        if (token) {
            setAuthToken(token);
        }
    }, [token]);

    useEffect(() => {
        socket.on("new-user-registered", (newUser) => {
            setNonFriends((prev) => {
                const exists = prev.find((nf) => nf._id === newUser._id);
                if (exists) return prev;
                return [...prev, newUser];
            });
        });

        return () => {
            socket.off("new-user-registered");
        };
    }, [socket]);

    const validate = async () =>{
        try {
            const res = await api.get("/user/validate", {
                credentials: "include",
            });
            return res.status===200;
        } catch (error) {
            console.log(error);
        } 
    }

    // ✅ LOGIN
    const login = async (data) => {
        const promise = loginRequest(data);

        toast.promise(promise, {
            loading: "Logging in...",
            success: "Logged in successfully",
            error: (e) => e?.response?.data?.message || "Failed to log in",
        });

        try {
            const { token: newToken, user: newUser } = await promise;
            if (!newToken || !newUser) return { success: false };

            setToken(newToken);
            localStorage.setItem("token", newToken);
            setAuthToken(newToken);
            setUser(newUser);
            localStorage.setItem("user", JSON.stringify(newUser));

            return { success: true, newUser, newToken };
        } catch {
            return { success: false };
        }
    };

    // ✅ SIGN UP
    const signUp = async (data) => {
        const promise = signUpRequest(data);

        toast.promise(promise, {
            loading: "Creating account...",
            success: "Account created",
            error: (e) => e?.response?.data?.message || "Failed to sign up",
        });

        try {
            const { token: newToken, user: newUser } = await promise;
            if (!newToken || !newUser) return { success: false };

            setToken(newToken);
            localStorage.setItem("token", newToken);
            setAuthToken(newToken);
            setUser(newUser);
            localStorage.setItem("user", JSON.stringify(newUser));

            return { success: true, newUser, newToken };
        } catch {
            return { success: false };
        }
    };

    // ✅ LOGOUT
    const logout = async () => {
        const promise = logOutClient();

        toast.promise(promise, {
            loading: "Logging out...",
            success: "Logged out",
            error: "Failed to log out",
        });

        try {
            await promise;
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
        } catch {
            // toast already shown
        }
    };

    // ✅ FETCH CHAT LIST
    const myChatlist = async () => {
        try {
            const res = await getChatlist();
            if (res?.error || res?.success === false) {
                toast.error(res?.message || "Failed to fetch chats");
            }
            return res;
        } catch (error) {
            toast.error("Failed to fetch chats");
        }
    };

    // ✅ FETCH CHAT BY ID
    const chat = async (chatId) => {
        try {
            const res = await getChat(chatId);
            return res.data;
        } catch (error) {
            toast.error("Failed to fetch chat");
            throw error;
        }
    };

    // ✅ CREATE NEW CHAT
    const createChat = async (data) => {
        try {
            const res = await createNewChat(data);
            toast.success("Chat created");
            return res.data;
        } catch (error) {
            toast.error("Failed to create chat");
        }
    };

    // ✅ SEND MESSAGE
    const send = async (msgData) => {
        try {
            const res = await sendMsg(msgData);
            return res.data;
        } catch (error) {
            toast.error("Failed to send message");
            throw error;
        }
    };

    // ✅ DELETE MESSAGE
    const deleteMessage = async (msgData) => {
        try {
            const res = await deleteMsg(msgData);
            toast.success("Message deleted");
        } catch (error) {
            toast.error("Failed to delete message");
            throw error;
        }
    };

    // ✅ UPLOAD AVATAR (Cloudinary)
    const uploadAvatar = async (file) => {
        const id = toast.loading("Uploading avatar...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
            "upload_preset",
            import.meta.env.VITE_CLOUDINARY_PRESET_NAME
        );
        formData.append("cloud_name", import.meta.env.VITE_CLOUD_NAME);

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${
                    import.meta.env.VITE_CLOUD_NAME
                }/image/upload`,
                { method: "POST", body: formData }
            );

            const data = await response.json();
            toast.success("Avatar uploaded");
            return data.secure_url;
        } catch (error) {
            toast.error("Avatar upload failed");
            throw error;
        } finally {
            toast.dismiss(id);
        }
    };

    // ✅ FETCH NON-FRIENDS
    const nonFriendsList = async () => {
        try {
            const res = await getNonFriendList();
            if (res?.error) toast.error("Failed to fetch non-friends");
            return res;
        } catch {
            toast.error("Failed to fetch non-friends");
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
            nonFriendsList,
            validate,
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
            nonFriendsList,
            validate,
        ]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
