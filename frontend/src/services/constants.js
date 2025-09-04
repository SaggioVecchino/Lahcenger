if (!process.env?.REACT_APP_BACKEND_URI) {
  var BACKEND_IS_HTTPS = false;
  var BACKEND_URI_WITHOUT_PORT = "localhost";
  var BACKEND_URI_PORT = 5000;
}
export const BACKEND_URI = (
  process.env?.REACT_APP_BACKEND_URI
    ? process.env.REACT_APP_BACKEND_URI
    : `${
        BACKEND_IS_HTTPS ? "https" : "http"
      }://${BACKEND_URI_WITHOUT_PORT}:${BACKEND_URI_PORT}`
).replace(/\/$/, "");
export const LOCAL_STORAGE_NAME = "user_infos";
export const ACCEPT_REQUEST = "accept";
export const REJECT_REQUEST = "reject";
export const API_LOGOUT = `${BACKEND_URI}/logout`;
export const API_LOGIN = `${BACKEND_URI}/login`;
export const API_SIGNUP = `${BACKEND_URI}/signup`;
export const API_CHECK_TOKEN = `${BACKEND_URI}/check_token`;
export const API_FRIENDS_LIST = `${BACKEND_URI}/friends/list`;
export const API_FRIENDS_INCOMING_REQUESTS = `${BACKEND_URI}/friends/incoming_requests`;
export const API_FRIENDS_SENT_REQUESTS = `${BACKEND_URI}/friends/sent_requests`;
export const API_FRIENDS_SEND_REQUEST = `${BACKEND_URI}/friends/send_request`;
export const API_FRIENDS_CANCEL_REQUEST = `${BACKEND_URI}/friends/cancel_request`;
export const API_FRIENDS_RESPOND = `${BACKEND_URI}/friends/respond`;
export const API_MESSAGES_HISTORY = `${BACKEND_URI}/messages/history`;
export const API_USERS_SEARCH = `${BACKEND_URI}/users/search?`;
