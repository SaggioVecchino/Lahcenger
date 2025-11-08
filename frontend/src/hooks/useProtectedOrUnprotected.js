import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function useProtectedUnprotected(isProtected) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if ((isProtected && user == null) || (!isProtected && user != null)) {
      navigate("/redirector", { replace: true });
    }
  }, [user, navigate, isProtected]);
}
