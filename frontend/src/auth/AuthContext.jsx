import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, {
  clearTokens,
  setOnAuthFailure,
  storeTokens,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  useEffect(() => {
    setOnAuthFailure(logout);

    const access = localStorage.getItem("access");
    if (!access) {
      setLoading(false);
      return;
    }

    api
      .get("/api/auth/me/")
      .then((response) => setUser(response.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      logout,
      async login(credentials) {
        const { data } = await api.post("/api/auth/token/", credentials);
        storeTokens(data);
        const me = await api.get("/api/auth/me/");
        setUser(me.data);
      },
      async register(payload) {
        const { data } = await api.post("/api/auth/register/", payload);
        storeTokens({ access: data.access, refresh: data.refresh });
        setUser({ id: data.id, username: data.username, email: data.email });
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
