import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Error from "./pages/Error.jsx";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const App = () => {
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
            <Toaster
                position="bottom-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 2500,
                    style: { fontSize: "14px" },
                }}
            />
            <Analytics />
            <SpeedInsights />
        </>
    );
};

export default App;
