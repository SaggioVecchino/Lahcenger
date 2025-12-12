import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { BACKEND_URI } from "../services/constants";

import io from "socket.io-client";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user != null) {
      const s = io(`${BACKEND_URI}`, { query: { token } });
      s.on("connected", () => { });
      setSocket(s);
      return () => s.disconnect();
    }
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
