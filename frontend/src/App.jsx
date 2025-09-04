import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useEffect } from "react";

const socket = io("http://localhost:4000");

const App = () => {
    useEffect(() => {
        socket.on("connect", () => {
        });

        return () => {
            socket.disconnect()
        }
    },[]);
    const router = createBrowserRouter([
        {
            path: "/",
            element: <LandingPage />,
        },
        {
            path: "/dashboard",
            element: <Dashboard />,
        },
    ]);

    return (
        <>
            <RouterProvider router={router} />
        </>
    );
};

export default App;
