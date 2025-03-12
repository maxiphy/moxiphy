"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// The PIN should be a 6-digit number
const CORRECT_PIN = process.env.NEXT_PUBLIC_ACCESS_PIN || "123456";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('moxiphy_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (pin: string): boolean => {
    if (pin === CORRECT_PIN) {
      setIsAuthenticated(true);
      localStorage.setItem('moxiphy_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('moxiphy_auth');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
