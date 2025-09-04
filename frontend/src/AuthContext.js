import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  LOCAL_STORAGE_NAME,
  API_LOGOUT,
  API_LOGIN,
} from "./services/constants";
import {
  extractTokenFromSession,
  extractUserFromSession,
} from "./services/utils";
import io from "socket.io-client";
import { BACKEND_URI } from "./services/constants";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(extractTokenFromSession);
  const [user, setUser] = useState(extractUserFromSession);
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

  const forceUpdateInfos = useCallback(() => {
    setUser(extractUserFromSession());
    setToken(extractTokenFromSession());
  }, []);

  const checkConflict = useCallback(() => {
    const currentConnectedUser = extractUserFromSession();
    if (currentConnectedUser == null && user != null) return true;
    return currentConnectedUser != null && currentConnectedUser.id !== user?.id;
  }, [user]);

  const resolveIfConflict = useCallback(() => {
    if (checkConflict()) {
      alert("conflict detected, will force update");
      forceUpdateInfos();
      return true;
    }
    return false;
  }, [checkConflict, forceUpdateInfos]);

  const deleteSessionInfos = useCallback(() => {
    if (!resolveIfConflict()) {
      localStorage.removeItem(LOCAL_STORAGE_NAME);
      setUser(null);
      setToken("");
    }
  }, [resolveIfConflict]);

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
    if (resolveIfConflict()) {
      alert("A session is already open");
      return { success: true, message: "A session is already open" };
    }
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

  const apiFetch = useCallback(
    async (url, opts = {}, forcedToken = null) => {
      if (!resolveIfConflict()) {
        if (forcedToken == null) forcedToken = token;
        if (forcedToken == null || forcedToken === "") return;
        if (url !== `${API_LOGOUT}` && user == null) return;
        try {
          let res = await fetch(url, {
            ...opts,
            headers: {
              ...(opts.headers || {}),
              Authorization: "Bearer " + forcedToken,
              "Content-Type": "application/json",
            },
          });
          if ([401, 403].includes(res.status)) {
            res = await res.json();
            return res;
          }
          res = await res.json();
          return res;
        } catch (error) {}
      }
    },
    [resolveIfConflict, token, user]
  );

  const handleLogout = useCallback(async () => {
    if (user != null) {
      await apiFetch(`${API_LOGOUT}`, { method: "POST" });
      deleteSessionInfos();
    }
  }, [user, deleteSessionInfos, apiFetch]);

  const logout = useCallback(async () => {
    await handleLogout();
  }, [handleLogout]);

  useEffect(() => {
    if (user == null) {
      logout();
    }
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, apiFetch, updateSocket, socket }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
