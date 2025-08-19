import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import LoginSignupForm from "../components/LoginSignupForm";

export default function Login({ initUsername = null, initPassword = null }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (username, password) => {
    const { success, message } = await login(username, password);
    if (success) {
      navigate("/");
    } else {
      alert(message);
    }
  };

  return (
    <LoginSignupForm
      onSubmit={handleSubmit}
      isLoginPage={true}
      initUsername={initUsername}
      initPassword={initPassword}
    />
  );
}
