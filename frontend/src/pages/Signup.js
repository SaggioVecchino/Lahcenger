import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import LoginSignupForm from "../components/LoginSignupForm";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (username, password) => {
    const res = await fetch("http://localhost:5000/signup", {
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
