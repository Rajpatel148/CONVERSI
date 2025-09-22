import { StrictMode } from "react";
// Ensure Agora SDK log level is set before any component uses it
import "./lib/agora";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/Authcotext.jsx";

createRoot(document.getElementById("root")).render(
    // <StrictMode>
    <AuthProvider>
        <App />
    </AuthProvider>
    // </StrictMode>
);
