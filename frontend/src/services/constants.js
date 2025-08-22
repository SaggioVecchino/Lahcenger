export const ACCEPT_REQUEST = "accept";
export const REJECT_REQUEST = "reject";
export const BACKEND_IS_HTTPS = false;
export const BACKEND_URI_WITHOUT_PORT = "localhost";
export const BACKEND_URI_PORT = 5000;
export const BACKEND_URI = `${
  BACKEND_IS_HTTPS ? "https" : "http"
}://${BACKEND_URI_WITHOUT_PORT}:${BACKEND_URI_PORT}`;
