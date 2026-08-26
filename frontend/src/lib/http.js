import axios from "axios";
import { getToken } from "./local-storage";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

httpClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
