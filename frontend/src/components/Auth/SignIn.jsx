import { useState } from "react";
import { useAuth } from "../../context/Authcotext.jsx";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const SignIn = ({ isSignIn, setIsSignIn }) => {
    const navigate = useNavigate();
    const { login, socket } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });

    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
    });

    const validate = () => {
        const newErrors = {};
        if (!formData.username.trim())
            newErrors.username = "Username is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                newErrors.email = "Invalid email format";
            }
        }
        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else {
            if (formData.password.length < 8) {
                newErrors.password = "Password must be at least 8 characters";
            }
        }

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            toast.error("Please fix the errors in the form.");
            return;
        }

        try {
            const res = await login(formData);
            if (res?.success && res?.newUser?._id) {
                socket.emit("setup", res.newUser._id);
                navigate("/dashboard");
                toast.success("Welcome back!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Login failed");
        }

        setFormData({
            username: "",
            email: "",
            password: "",
        });
    };

    return (
        <>
            <form className="signInForm" onSubmit={handleSubmit} noValidate>
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
                {errors.username && (
                    <p className="error-text">{errors.username}</p>
                )}

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
                {errors.password && (
                    <p className="error-text">{errors.password}</p>
                )}

                <button type="submit" className="submit">
                    Sign In
                </button>
                <p className="toggleText">
                    Don't have an account?{" "}
                    <span
                        className="toggleLink"
                        onClick={() => setIsSignIn(false)}
                    >
                        Sign Up
                    </span>
                </p>
            </form>
        </>
    );
};

export default SignIn;
