import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/Authcotext.jsx";


const SignUp = ({ isSignIn, setIsSignIn }) => {
    const navigate = useNavigate();
    const { signUp , uploadAvatar } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        fullname: "",
        email: "",
        password: "",
        avatar: null,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Handle form submission logic here

        try {
            const res = await signUp(formData);
            io.emit("new-user-registered", res); 
            if (res.success) {
                navigate("/dashboard");
            }
        } catch (error) {
            console.log(error);
        }
        // Reset form fields
        setFormData({
            username: "",
            fullname: "",
            email: "",
            password: "",
        });
    };

    const handleUpload = async (e) =>{
        const file  = e.target.files[0];
        if(!file) return;

        const avatarUrl = await uploadAvatar(file);
        setFormData((prevData) => ({
            ...prevData,
            avatar: avatarUrl,
        }));
    }
    return (
        <form className="signUpForm">
            <label htmlFor="avatar">Avatar</label>
            <input type="file" id="avatar" name="avatar" accept="image/*" onChange={handleUpload} required/> 
            <label htmlFor="username">Username</label>
            <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
            />
            <label htmlFor="fullname">Full Name</label>
            <input
                type="text"
                id="fullname"
                name="fullname"
                placeholder="Enter your name"
                value={formData.fullname}
                onChange={handleChange}
                required
            />
            <label htmlFor="email">Email</label>
            <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
            />
            <label htmlFor="password">Password</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
            />
            <button type="submit" className="submit" onClick={handleSubmit}>
                Create Account
            </button>
            <p className="toggleText">
                Already have an account?{" "}
                <span className="toggleLink" onClick={() => setIsSignIn(true)}>
                    Sign In
                </span>
            </p>
        </form>
    );
};

export default SignUp;
