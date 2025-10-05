import { LOCAL_STORAGE_NAME } from "./constants";

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export const isPasswordAcceptable = (password) => {
  if (password.length < 8) {
    return false;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  return hasLetter && hasDigit;
};
