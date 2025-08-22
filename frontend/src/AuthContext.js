import { createContext, useContext, useState, useEffect } from "react";
import { BACKEND_URI } from "./services/constants";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (loggingOut) {
      handleLogout();
    }
  }, [loggingOut]);

  useEffect(() => {
    if (user == null) {
      if (!loggingOut) {
        setLoggingOut(true);
        setLoading(true);
      }
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const { token, id, username } = getSessionInfos();
    setUser({ id, username });
    setToken(token);
    setLoading(false);
  }, []);

  const deleteSessionInfos = () => {
    localStorage.removeItem("user_infos");
    setUser(null);
    setToken("");
  };

  const setSessionInfos = ({ token, id, username }) => {
    setLoading(true);
    if (token == null || token === "") return;
    localStorage.setItem("user_infos", JSON.stringify({ token, id, username }));
    setToken(token);
    setUser({ id, username });
    setLoading(false);
  };

  const getSessionInfos = () => {
    const data = JSON.parse(localStorage.getItem("user_infos"));
    return { token: data?.token, id: data?.id, username: data?.username };
  };

  const login = async (username, password) => {
    const res = await fetch(`${BACKEND_URI}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      setSessionInfos({
        token: data.token,
        id: data.user_id,
        username,
      });
      return { success: true, message: null };
    } else {
      return { success: false, message: data.message || "Login failed" };
    }
  };

  const logout = () => {
    setLoggingOut(true);
    setLoading(true);
    // useEffect will call handleLogout
  };

  const handleLogout = async () => {
    apiFetch(`${BACKEND_URI}/logout`, { method: "POST" }).then(() => {
      deleteSessionInfos();
      setLoading(false);
      setLoggingOut(false);
    });
  };

  const apiFetch = async (url, opts = {}) => {
    if (token == null || token === "") return;
    if (url === `${BACKEND_URI}/logout` && !loggingOut) return;
    if (url !== `${BACKEND_URI}/logout` && loggingOut) return;
    try {
      let res = await fetch(url, {
        ...opts,
        headers: {
          ...(opts.headers || {}),
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      if (res.status === 401) {
        deleteSessionInfos();
        res = await res.json();
        return;
      }
      res = await res.json();
      return res;
    } catch (error) {}
  };

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, apiFetch, loading, loggingOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
