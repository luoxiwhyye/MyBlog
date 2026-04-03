import axios from "axios";

const request = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  },
);

export default request;
