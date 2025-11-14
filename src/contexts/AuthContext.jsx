import { createContext, useContext, useState, useEffect } from "react";
import * as authService from "@/services/auth";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Check if user is stored in localStorage
    return authService.getCurrentUser();
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync user state when localStorage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = (allowedRoles) => {
    if (!user || !user.roleName) return false;
    return allowedRoles.includes(user.roleName);
  };

  const isAuthenticated = () => {
    return authService.isAuthenticated();
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        hasPermission, 
        isAuthenticated,
        isLoading 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};