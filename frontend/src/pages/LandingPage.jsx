import React, { useEffect, useState } from "react";
import { MessageCircle, Phone, UserLock, Video } from "lucide-react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import "./LandingPage.css";
import Spline from "@splinetool/react-spline";
import Auth from "../components/Auth/Auth";
import { useAuth } from "../context/Authcotext";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
    const [authVisible, setAuthVisible] = useState(false);
    const [isSignIn, setIsSignIn] = useState(false);
    const navigate = useNavigate();

    const { user, validate } = useAuth();
    useEffect(() => {
        if (user && validate()) {
            navigate("/dashboard");
        }
    }, []);
    return (
        <div className="landingPage">
            {/* NavBar */}
            <header className="navContainer">
                <div className="sectionContainer navbar">
                    <div className="navLogo">
                        <MessageCircle
                            className="logo"
                            size={35}
                            color="#15803cc5"
                            strokeWidth={2.5}
                        />
                        <span className="logo-name">Conversi</span>
                    </div>
                    <nav className="navItems">
                        <a href="#features">Features</a>
                        <a href="#about">Security</a>
                        <a href="#contact">Download</a>
                    </nav>
                    <div className="navBtns">
                        <Button
                            onClick={() => {
                                setAuthVisible(true);
                                setIsSignIn(true);
                                return true;
                            }}
                            className="nav-btn"
                        >
                            Log in
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setAuthVisible(true);
                                setIsSignIn(false);
                                return true;
                            }}
                            className="nav-btn"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="heroContainer" id="hero">
                <div className="sectionContainer hero-section">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Connect with Your{" "}
                            <span style={{ color: "green" }}> Loved Ones</span>{" "}
                            Instantly
                        </h1>
                        <p className="hero-desc">
                            Experience seamless messaging like never before.
                            Simple, reliable, private messaging and calling for
                            everyone.
                        </p>
                        <div className="heroBtns">
                            <Button
                                variant="contained"
                                onClick={() => {
                                    setAuthVisible(true);
                                    setIsSignIn(true);
                                    return true;
                                }}
                                className="hero-btn"
                                sx={{
                                    color: "white",
                                    backgroundColor: "green",
                                    textTransform: "capitalize",
                                    fontSize: "1rem",
                                    fontFamily: "poppins",
                                    padding: "0.4rem 2rem",
                                }}
                            >
                                Start Messaging
                            </Button>
                            <Button
                                variant="outlined"
                                href="#features"
                                className="hero-btn"
                                sx={{
                                    color: "green",
                                    borderColor: "green",
                                    textTransform: "capitalize",
                                    fontSize: "1rem",
                                    fontFamily: "poppins",
                                    padding: "0.4rem 2rem",
                                }}
                            >
                                Learn More
                            </Button>
                        </div>
                    </div>
                    <div
                        className="hero-image"
                        style={{
                            borderRadius: "20px",
                            overflow: "hidden",
                        }}
                    >
                        <Spline scene="https://prod.spline.design/X7Hn2nqV-m13fS1s/scene.splinecode" />
                    </div>
                </div>
            </section>

            {/* Feature section */}
            <section className="featureContainer" id="features">
                <div className="sectionContainer feature-section">
                    <div className="feature-header">
                        <h2>Why Choose Conversa?</h2>
                        <p>
                            Built with privacy and simplicity in mind, Conversa
                            offers everything you need to stay connected.
                        </p>
                    </div>
                    <div className="feature-cards">
                        <div className="feature-card">
                            <MessageCircle
                                size={35}
                                color="#15803cc5"
                                strokeWidth={2.5}
                            />
                            <h3>Instant Messaging</h3>
                            <p>
                                Send messages instantly with real-time delivery
                                and read receipts.
                            </p>
                        </div>
                        <div className="feature-card">
                            <UserLock
                                size={35}
                                color="#15803cc5"
                                strokeWidth={2.5}
                            />
                            <h3>Privacy</h3>
                            <p>
                                We never access your messages — your data stays
                                with you.
                            </p>
                        </div>
                        <div className="feature-card">
                            <Phone
                                size={35}
                                color="#15803cc5"
                                strokeWidth={2.5}
                            />
                            <h3>Voice Calls</h3>
                            <p>
                                Crystal clear voice calls with your contacts
                                anywhere in the world.
                            </p>
                        </div>
                        <div className="feature-card">
                            <Video
                                size={35}
                                color="#15803cc5"
                                strokeWidth={2.5}
                            />
                            <h3>Video Calls</h3>
                            <p>
                                Face-to-face conversations with high-quality
                                video calling.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA section */}
            <section className="ctaContainer" id="cta">
                <div className="sectionContainer">
                    <h2>Ready to Get Started?</h2>
                    <p>
                        Join millions of people who trust Conversa for their
                        daily conversations. It's free, fast, and secure.
                    </p>
                    <div className="ctaBtns">
                        <Button
                            variant="contained"
                            onClick={() => {
                                setAuthVisible(true);
                                setIsSignIn(true);
                                return true;
                            }}
                            className="cta-btn"
                            sx={{
                                color: "white",
                                backgroundColor: "green",
                                textTransform: "capitalize",
                                fontSize: "1rem",
                                fontFamily: "poppins",
                                padding: "0.4rem 2rem",
                            }}
                        >
                            Start Chatting Now
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setAuthVisible(true);
                                setIsSignIn(false);
                                return true;
                            }}
                            className="cta-btn"
                            sx={{
                                color: "green",
                                borderColor: "green",
                                textTransform: "capitalize",
                                fontSize: "1rem",
                                fontFamily: "poppins",
                                padding: "0.4rem 2rem",
                            }}
                        >
                            Create Account
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer section */}
            <footer>
                <p>
                    &copy; 2025 Conversi , All rights reserve by{" "}
                    <a href="https://github.com/Rajpatel148">RAJ MOVALIYA🚀</a>
                </p>
            </footer>

            {/* Auth model */}
            {authVisible && (
                <Box
                    onClick={() => setAuthVisible(false)}
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        height: "100vh",
                        width: "100vw",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            position: "absolute",
                            top: "1rem",
                            left: "auto",
                            zIndex: 2,
                        }}
                    >
                        <Auth
                            isSignIn={isSignIn}
                            setIsSignIn={setIsSignIn}
                            setAuthVisible={setAuthVisible}
                        />
                    </Box>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backdropFilter: "blur(4px)",
                            backgroundColor: "rgba(0, 0, 0, 0.28)",
                            zIndex: 1,
                        }}
                    />
                </Box>
            )}
        </div>
    );
};

export default LandingPage;
