import React, { useEffect, useState } from "react";
import { useAuth } from "../context/Authcotext.jsx";
import { Box, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { Send } from "lucide-react";
import ChatSideBar from "../components/dashboard/ChatSideBar.jsx/";
import ChatWindow from "../components/dashboard/ChatWindow.jsx/";

const Dashboard = () => {
    const navigate = useNavigate();
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
    if (loading) {
        //! use Skeleton here https://mui.com/material-ui/react-skeleton/
        return <div>Loading...</div>;
    }

    return (
        <Box
            sx={{
                p: { xs: 0, md: 0 },
                width: { xs: "100vw", md: "100vw" },
                height: { xs: "100vh", md: "100vh" },
                margin: "0 auto",
                minWidth: "min-content",
            }}
        >
            <Stack direction="row" sx={{ height: "100%" }}>
                {/* Sidebar */}
                <Box
                    sx={{
                        display: {
                            xs: activeChatId ? "none" : "flex",
                            md: "block",
                        },
                        width: { xs: "100%", md: "25vw" },
                        borderRight: { md: "1px solid #E0E0E0" },
                    }}
                >
                    <ChatSideBar />
                </Box>

                {/* Chat Window */}
                <Box
                    sx={{
                        height: "inherit",
                        width: { xs: "100%", md: "75vw" },
                        minWidth: "min-content",
                    }}
                >
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
                </Box>
            </Stack>
        </Box>
    );
};

export default Dashboard;
