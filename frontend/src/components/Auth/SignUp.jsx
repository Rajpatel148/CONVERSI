import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/Authcotext.jsx";
import toast from "react-hot-toast";

const SignUp = ({ isSignIn, setIsSignIn }) => {
    const navigate = useNavigate();
    const { signUp, uploadAvatar, socket } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        fullname: "",
        email: "",
        password: "",
        avatar: null, // store File object, not URL yet
    });

    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};
        if (!formData.username.trim())
            newErrors.username = "Username is required";
        if (!formData.fullname.trim())
            newErrors.fullname = "Full Name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else {
            if (formData.password.length < 8) {
                newErrors.password = "Password must be at least 8 characters";
            }
        }
        if (!formData.avatar) newErrors.avatar = "Avatar is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleFocus = (e) => {
        const { name } = e.target;
        setErrors((prevErrors) => ({
            ...prevErrors,
            [name]: "",
        }));
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFormData((prevData) => ({
            ...prevData,
            avatar: file, // just save the file, don't upload yet
        }));
        setErrors((prev) => ({ ...prev, avatar: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            toast.error("Please fill in all fields correctly.");
            return;
        }

        let avatarUrl = null;
        try {
            // Now upload the avatar (only now!)
            if (formData.avatar) {
                avatarUrl = await uploadAvatar(formData.avatar);
            }
        } catch (err) {
            toast.error("Avatar upload failed");
            return;
        }

        try {
            const res = await signUp({
                ...formData,
                avatar: avatarUrl,
            });

            if (res?.success && res?.newUser?._id) {
                socket.emit("new-user-registered", res.newUser);
            }

            if (res?.success) {
                toast.success("Welcome to Conversi!");
                navigate("/dashboard");
            } else {
                toast.error("Sign up failed");
            }
        } catch (error) {
            toast.error("Sign up failed");
            console.log(error);
        }

        setFormData({
            username: "",
            fullname: "",
            email: "",
            password: "",
            avatar: null,
        });
    };

    return (
        <form className="signUpForm" onSubmit={handleSubmit} noValidate>
            <label htmlFor="avatar">Avatar</label>
            <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleUpload}
                className={errors.avatar ? "input-error" : ""}
            />
            {errors.avatar && <p className="error-text">{errors.avatar}</p>}

            <label htmlFor="username">Username</label>
            <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.username ? "input-error" : ""}
                required
            />
            {errors.username && <p className="error-text">{errors.username}</p>}

            <label htmlFor="fullname">Full Name</label>
            <input
                type="text"
                id="fullname"
                name="fullname"
                placeholder="Enter your name"
                value={formData.fullname}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.fullname ? "input-error" : ""}
                required
            />
            {errors.fullname && <p className="error-text">{errors.fullname}</p>}

            <label htmlFor="email">Email</label>
            <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.email ? "input-error" : ""}
                required
            />
            {errors.email && <p className="error-text">{errors.email}</p>}

            <label htmlFor="password">Password</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onFocus={handleFocus}
                className={errors.password ? "input-error" : ""}
                required
            />
            {errors.password && <p className="error-text">{errors.password}</p>}

            <button type="submit" className="submit">
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
