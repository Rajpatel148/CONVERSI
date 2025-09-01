import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const App = () => {
    const router = createBrowserRouter([
        {
            path: "/",
            element: <LandingPage />,
        },
        {
          path:"/dashboard",
          element:<Dashboard />
        }
    ]);

    return (
      <>
        <RouterProvider router={router} />
      </>
    );
};

export default App;
