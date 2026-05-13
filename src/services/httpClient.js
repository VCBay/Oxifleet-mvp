import axios from "axios";

export const AUTH_API_BASE =
  import.meta.env.VITE_AUTH_API_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  "http://localhost:5000/api";

export const authHttp = axios.create({
  baseURL: AUTH_API_BASE,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token) => {
  if (token) {
    authHttp.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete authHttp.defaults.headers.common.Authorization;
};
