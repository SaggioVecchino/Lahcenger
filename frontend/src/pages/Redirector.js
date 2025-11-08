import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Redirector() {
  const { user } = useAuth();
  if (user == null) {
    return <Navigate to="/login" replace />;
  } else {
    return <Navigate to="/" replace />;
  }
}
