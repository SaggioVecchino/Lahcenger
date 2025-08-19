import { useEffect, useState } from "react";
import "../styles/login_signup.css";

export default function LoginSignupForm({ onSubmit, isLoginPage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(username, password);
  };

  return (
    <div className="container-center-sub height-filler bg-fb-blue min-width-300">
      <form onSubmit={handleSubmit} className="login-signup">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
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
