import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("smartspend_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("smartspend_user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((token, userData) => {
    localStorage.setItem("smartspend_token", token);
    localStorage.setItem("smartspend_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("smartspend_token");
    localStorage.removeItem("smartspend_user");
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem("smartspend_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (!cancelled) {
          const userData = response.data.user;
          localStorage.setItem(
            "smartspend_user",
            JSON.stringify(userData)
          );
          setUser(userData);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const response = await api.post("/auth/login", credentials);
      const { token, user: userData } = response.data;

      saveSession(token, userData);

      return userData;
    },
    [saveSession]
  );

  const register = useCallback(
    async (details) => {
      const response = await api.post("/auth/register", details);
      const { token, user: userData } = response.data;

      saveSession(token, userData);

      return userData;
    },
    [saveSession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user && localStorage.getItem("smartspend_token")),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}