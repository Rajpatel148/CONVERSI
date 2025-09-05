import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { io } from "socket.io-client";
import { useEffect } from "react";
import Error from "./pages/Error.jsx";
import { useAuth } from "./context/Authcotext.jsx";

const App = () => {
    const { socket } = useAuth();
    useEffect(() => {
        socket.on("connect", () => {});

        return () => {
            socket.disconnect();
        };
    }, []);
    const router = createBrowserRouter([
        {
            path: "/",
            errorElement: <Error />,
            element: <LandingPage />,
        },
        {
            path: "/dashboard",
            errorElement: <Error />,
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
