import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

let onAuthFailure = () => {};

export function setOnAuthFailure(callback) {
  onAuthFailure = callback;
}

export function storeTokens({ access, refresh }) {
  localStorage.setItem("access", access);
  if (refresh) {
    localStorage.setItem("refresh", refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export function formatApiError(error) {
  const data = error.response?.data;
  if (!data) {
    return "Something went wrong. Please try again.";
  }
  if (typeof data.detail === "string") {
    return data.detail;
  }
  if (Array.isArray(data.detail)) {
    return data.detail.join(" ");
  }
  if (typeof data === "object") {
    return Object.entries(data)
      .flatMap(([field, messages]) => {
        const list = Array.isArray(messages) ? messages : [messages];
        return list.map((message) =>
          field === "non_field_errors" ? String(message) : `${field}: ${message}`,
        );
      })
      .join(" ");
  }
  return "Something went wrong. Please try again.";
}

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";
    const isRefreshCall = url.includes("/api/auth/token/refresh/");
    const isLoginCall = url.includes("/api/auth/token/") && !isRefreshCall;

    if (status === 401 && original && !original._retry && !isRefreshCall && !isLoginCall) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/token/refresh/`,
            { refresh },
          );
          storeTokens({ access: data.access });
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          clearTokens();
          onAuthFailure();
        }
      } else {
        clearTokens();
        onAuthFailure();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
