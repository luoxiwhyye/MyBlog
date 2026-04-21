import axios from "axios";

const request = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  timeout: 10000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  },
);

export default request;
