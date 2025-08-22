import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import LoginSignupForm from "../components/LoginSignupForm";
import { useEffect } from "react";

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user != null) {
      navigate("/");
    }
  });

  const handleSubmit = async (username, password) => {
    const { success, message } = await login(username, password);
    if (success) {
      navigate("/");
    } else {
      alert(message);
    }
  };

  return <LoginSignupForm onSubmit={handleSubmit} isLoginPage={true} />;
}
