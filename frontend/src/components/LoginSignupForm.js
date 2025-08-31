import { useState, useEffect } from "react";
import "../styles/login_signup.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import lahcengerLogo from "../assets/LahcengerLogo.png";

export default function LoginSignupForm({ onSubmit, isLoginPage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user != null) {
      navigate("/redirector");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(username, password);
  };

  return (
    <div className="container-center-sub height-filler bg-fb-blue min-width-300">
      <img src={lahcengerLogo} alt="Lahcenger Logo" id="top-logo" />
      <form onSubmit={handleSubmit} className="login-signup">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoCapitalize="none"
          autoComplete="username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />
        <button type="submit">{isLoginPage ? "Login" : "Signup"}</button>
        <a
          href={isLoginPage ? "/signup" : "/login"}
          className="redirect-login-signup"
        >
          {isLoginPage ? "Don't have an account" : "Already have an account"}
        </a>
      </form>
    </div>
  );
}
