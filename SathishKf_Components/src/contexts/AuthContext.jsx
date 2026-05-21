import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("p2p_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email, password, role) => {
    const mockUser = {
      id: "1",
      name:
        email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1),
      email,
      role,
    };

    setUser(mockUser);
    localStorage.setItem("p2p_user", JSON.stringify(mockUser));

    // Role-based redirect
    if (role === "Requester") {
      window.REACT_APP_NAVIGATE?.("/requester/dashboard");
    } else {
      window.REACT_APP_NAVIGATE?.("/");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("p2p_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
