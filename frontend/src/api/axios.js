import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

// Helper to set Authorization header when using token-based auth
export const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

// Always attach token if present (covers hard reloads)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const loginRequest = async (data) => {
    let token = null;
    let user = null;
    try {
        const res = await api.post("/user/login", data);
        user = res.data.data.user || null;
        token = res.data.accessToken || null;
        if (token) setAuthToken(token);
    } catch (error) {
        console.error(
            "Login Error:",
            error.response ? error.response.data : error.message
        );
    }
    return { token, user, data };
};

export const signUpRequest = async (data) => {
    let token = null;
    let user = null;
    try {
        const res = await api.post("/user/signup", data);
        user = res.data.data.user || null;
        token = res.data.accessToken || null;
        if (token) setAuthToken(token);
    } catch (error) {
        console.error(
            "SignUp Error:",
            error.response ? error.response.data : error.message
        );
    }
    return { token, user, data };
};

export const logOutClient = async () => {
    setAuthToken(null);
    try {
        await api.post("/user/logout");
    } catch (error) {
        console.error(
            "Logout Error:",
            error.response ? error.response.data : error.message
        );
    }
};

// Get chat list with better error handling
export const getChatlist = async () => {
    try {
        const res = await api.get("/chat/list");
        return res.data;
    } catch (error) {
        console.error(
            "Get Chat List Error:",
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to fetch chat list",
            details: error.response ? error.response.data : error.message,
        };
    }
};

export const getChat = async (chatId) => {
    try {
        const res = await api.get(`/message/c/${chatId}`);
        return res.data;
    } catch (error) {
        console.error(
            `Get Chat ${chatId} Error:`,
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to fetch chat",
            details: error.response ? error.response.data : error.message,
        };
    }
};

export const sendMsg = async (msgData) => {
    try {
        const res = await api.post("/message/send", msgData);
        return res.data;
    } catch (error) {
        console.error(
            "Send Message Error:",
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to send message",
            details: error.response ? error.response.data : error.message,
        };
    }
};

export const deleteMsg = async (msgData) => {
    try {
        const res = await api.post("/message/delete", msgData);
        return res.data;
    } catch (error) {
        console.error(
            "Delete Message Error:",
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to delete message",
            details: error.response ? error.response.data : error.message,
        };
    }
};

export const getNonFriendList = async () => {
    try {
        const res = await api.get("/chat/non-friends");
        return res.data.data;
    } catch (error) {
        console.error(
            "Get Non-Friend List Error:",
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to fetch non-friends list",
            details: error.response ? error.response.data : error.message,
        };
    }
};

export const createNewChat = async (data) => {
    try {
        const res = await api.post("/chat/create", data);
        return res.data;
    } catch (error) {
        console.error(
            "Create New Chat Error:",
            error.response ? error.response.data : error.message
        );
        return {
            error: "Failed to create new chat",
            details: error.response ? error.response.data : error.message,
        };
    }
};
export default api;
