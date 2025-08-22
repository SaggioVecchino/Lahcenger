import { useEffect } from "react";
import { LOCAL_STORAGE_NAME } from "./constants";

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const useClickOutside = (ref, callback) => {
  useEffect(() => {
    function handleClick(event) {
      if (!ref.current) return;
      for (let i = 0; i < ref.current.length; i++)
        if (ref.current[i].contains(event.target)) return;
      callback();
    }

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [ref, callback]);
};

export const extractUserFromSession = () => {
  const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_NAME));
  if (data?.id != null && data?.username != null)
    return { id: data.id, username: data.username };
  return null;
};

export const extractTokenFromSession = () => {
  const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_NAME));
  if (data?.token == null) return "";
  return data.token;
};
