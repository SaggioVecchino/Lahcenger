import { createContext, useContext, useState, useEffect } from "react";
import {
  LOCAL_STORAGE_NAME,
  API_LOGOUT,
  API_LOGIN,
} from "./services/constants";
import {
  // sleep,
  extractTokenFromSession,
  extractUserFromSession,
} from "./services/utils";
import io from "socket.io-client";
import { BACKEND_URI } from "./services/constants";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(extractTokenFromSession());
  const [user, setUser] = useState(extractUserFromSession());
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user != null) {
      const s = io(`${BACKEND_URI}`, { query: { token } });
      s.on("connected", () => {});
      setSocket(s);
      return () => s.disconnect();
    }
  }, [user, token]);

  const updateSocket = (s) => {
    setSocket(s);
  };

  const deleteSessionInfos = () => {
    localStorage.removeItem(LOCAL_STORAGE_NAME);
    setUser(null);
    setToken("");
  };

  const setSessionInfos = ({ token, id, username }) => {
    if (token == null || token === "") return;
    localStorage.setItem(
      LOCAL_STORAGE_NAME,
      JSON.stringify({ token, id, username })
    );
    setToken(token);
    setUser({ id, username });
  };

  const login = async (username, password) => {
    const res = await fetch(`${API_LOGIN}`, {
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
    handleLogout();
  };

  useEffect(() => {
    if (user == null) {
      logout();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user != null) {
      apiFetch(`${API_LOGOUT}`, { method: "POST" }).then(() => {
        deleteSessionInfos();
      });
    }
    // deleteSessionInfos();
  };

  const apiFetch = async (url, opts = {}) => {
    if (token == null || token === "") return;
    if (url === `${API_LOGOUT}` && user != null) return;
    if (url !== `${API_LOGOUT}/logout` && user == null) return;
    // await sleep(100); // Not the sexiest solution
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
      value={{ token, user, login, logout, apiFetch, updateSocket, socket }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
