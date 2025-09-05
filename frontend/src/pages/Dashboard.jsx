import React, { useEffect, useState } from "react";
import { useAuth } from "../context/Authcotext.jsx";
import { Box, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { Send } from "lucide-react";
import ChatSideBar from "../components/Dashboard/ChatSideBar.jsx";
import ChatWindow from "../components/Dashboard/ChatWindow.jsx";
import useIsMobile from "../hook/useIsMobile.jsx";


const Dashboard = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const {
        user,
        loading,
        activeChatId,
        myChatlist,
        setChatList,
        nonFriendsList,
        setNonFriends,
    } = useAuth();

    useEffect(() => {
        if (!user) {
            navigate("/");
        }
    }, []);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const chatData = await myChatlist();
                setChatList(Array.isArray(chatData?.data) ? chatData.data : []);
            } catch (error) {
                console.error("Error fetching chats:", error);
            }
        };

        const fetchNFChats = async () => {
            try {
                const nfData = await nonFriendsList();
                setNonFriends(Array.isArray(nfData) ? nfData : []);
            } catch (error) {
                console.log(error);
            }
        };
        fetchChats();
        fetchNFChats();
    }, []);
    if (loading) {
        //! use Skeleton here https://mui.com/material-ui/react-skeleton/
        return <div>Loading...</div>;
    }

    // ====== MOBILE RENDERING LOGIC ======
    if (isMobile) {
        return (
            <div className="dashboard mobile">
                {activeChatId ? <ChatWindow /> : <ChatSideBar />}
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <div className="chat-sidebar">
                <ChatSideBar />
            </div>

            {/* Chat Window */}
            <div className="chat-window">
                {activeChatId ? (
                    <ChatWindow />
                ) : (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            height: "100%",
                            color: "gray",
                            fontSize: "1rem",
                        }}
                    >
                        {" "}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "5rem",
                                    bgcolor: "#d3f1df",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    borderRadius: "50%",
                                    padding: "1.25rem 0.25rem",
                                    pr: 1,
                                }}
                            >
                                <Send
                                    size={50}
                                    color="rgba(0, 128, 0, 0.705)"
                                />
                            </Box>
                            <Typography
                                sx={{
                                    fontWeight: "bold",
                                    mt: 2,
                                    fontSize: "1.75rem",
                                    color: "#333",
                                }}
                            >
                                Welcome to Conversi
                            </Typography>
                            <Typography>
                                Select a chat to start messaging
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
