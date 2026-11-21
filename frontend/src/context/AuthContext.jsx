import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken()); // false while we check a saved login

  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me/")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const clear = () => setUser(null);
    window.addEventListener("fashionx-logout", clear);
    return () => window.removeEventListener("fashionx-logout", clear);
  }, []);

  const startSession = (data) => {
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email, password) =>
    startSession(await api("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) }));

  const register = async (payload) =>
    startSession(await api("/auth/register/", { method: "POST", body: JSON.stringify(payload) }));

  const logout = async () => {
    try {
      await api("/auth/logout/", { method: "POST" });
    } catch {
      /* the token may already be invalid, that is fine */
    }
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const updated = await api("/auth/me/", { method: "PATCH", body: JSON.stringify(payload) });
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
