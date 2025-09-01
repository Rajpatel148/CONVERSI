import React, { useState } from "react";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import "./Auth.css";

const Auth = ({ isSignIn, setIsSignIn ,setAuthVisible}) => {
    return (
        <>
            <div className="authContainer">
                <div className="auth">
                    <h1>Welcome {isSignIn ? "Back" : ""}</h1>
                    <p>Sign in to your account or create a new one</p>
                    <div className="authToggle">
                        <button
                            className={isSignIn ? "active" : ""}
                            onClick={() => setIsSignIn(true)}
                        >
                            Sign In
                        </button>
                        <button
                            className={!isSignIn ? "active" : ""}
                            onClick={() => setIsSignIn(false)}
                        >
                            Sign Up
                        </button>
                    </div>
                    {isSignIn == true ? (
                        <SignIn
                            isSignIn={isSignIn}
                            setIsSignIn={setIsSignIn}
                            onSucess={() => setAuthVisible(false)}
                        />
                    ) : (
                        <SignUp
                            isSignIn={isSignIn}
                            setIsSignIn={setIsSignIn}
                            onSucess={() => setAuthVisible(false)}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default Auth;
