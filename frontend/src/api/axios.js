import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    withCredentials: true,
});

// helper to set Authorization header when using token-based auth
export const setAuthToken = (token) => {
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    else delete api.defaults.headers.common["Authorization"];
};

export const loginRequest = async (data) => {
    let token = null;
    let user = null;
    try {
        const res = await api.post("/user/login", data);
        user = res.data.data.user || null;
        token = res.data.accessToken || null;
        if (token) setAuthToken(token);
    } catch (error) {
        console.log(error);
    }
    return { token, user, data };
};

export const signUpRequest = async (data) => {
    let token = null;
    let user = null;
    try {
        const res = await api.post("/user/signup", data);
        user = res.data.data.user || null;
        token = res.data.accessToken;
        if (token) setAuthToken(token);
    } catch (error) {
        console.log(error);
    }
    return { token, user, data };
};

export const logOutClient = async () => {
    setAuthToken(null);
    try {
        await api.post("/user/logout");
    } catch (error) {
        console.log(error);
    }
};

export const getChatlist = async () => {
    try {
        const res = await api.get("/chat/list");

        return res.data;
    } catch (error) {
        console.log(error);
    }
};

export const getChat = async (chatId) => {
    try {
        const res = await api.get(`/message/c/${chatId}`);
        return res.data;
    } catch (error) {
        console.log(error);
    }
};

export const sendMsg = async (msgData) => {
    try {
        const res = await api.post("/message/send", msgData);
        return res.data;
    } catch (error) {
        console.log(error);
    }
};

export const deleteMsg = async (msgData) => {
    try {
        const res = await api.post("/message/delete", msgData);
        return res.data;
    } catch (error) {
        console.log(error);
    }
};
export default api;
