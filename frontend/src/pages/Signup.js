import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import LoginSignupForm from "../components/LoginSignupForm";
import { API_SIGNUP } from "../services/constants";
import { isPasswordAcceptable } from "../services/utils";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (username, password) => {
    if (!isPasswordAcceptable(password)) {
      alert(
        "password must be at least 8 characters and include both letters and numbers."
      );
      return;
    }
    const res = await fetch(`${API_SIGNUP}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const { success } = await login(username, password);
      if (success) {
        navigate("/");
      } else {
        alert(
          "Signed up with success, but it seems there's a problem when trying to log in. Please try login in few seconds"
        );
        navigate("/login");
      }
    } else {
      alert(data.message || "Signup failed");
    }
  };

  return <LoginSignupForm onSubmit={handleSubmit} isLoginPage={false} />;
}
