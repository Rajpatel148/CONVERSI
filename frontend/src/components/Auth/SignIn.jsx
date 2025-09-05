import { useState } from "react";
import { useAuth } from "../../context/Authcotext.jsx";
import { useNavigate } from "react-router-dom";

const SignIn = ({ isSignIn, setIsSignIn }) => {
    const navigate = useNavigate();
    const { login, socket } = useAuth();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
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
            const res = await login(formData);     
            socket.emit("setup", res?.newUser?._id);
            if (res.success) {
                navigate("/dashboard");
            }
        } catch (error) {
            console.log(error);
        }
        // Reset form fields
        setFormData({
            username: "",
            email: "",
            password: "",
        });
    };
    return (
        <>
            <form className="signInForm">
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
