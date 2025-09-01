import { createContext, useContext, useState } from "react";
import {
    getChatlist,
    loginRequest,
    logOutClient,
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
    const [loading, setLoading] = useState(false);

    const login = async (data) => {
        setLoading(true);
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
            setLoading(false);
            return { success: true, newUser, newToken };
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const signUp = async (data) => {
        setLoading(true);
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
            setLoading(false);
            return { success: true, newUser, newToken };
        } catch (error) {
            setLoading(false);
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

    const myChatlist =async ()=>{
        setLoading(true);
        try {
            const res = await getChatlist();
            setLoading(false);
            return res;
        } catch (error) {
            setLoading(false);
            throw error;
        }
    }

    return (
        <AuthContext.Provider
            value={{ user, token, loading, login, logout, signUp ,myChatlist }}
        >
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => useContext(AuthContext);
