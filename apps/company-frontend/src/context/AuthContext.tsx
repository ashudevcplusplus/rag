import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CompanyConfig } from '@repo/shared';

interface AuthContextType {
  config: CompanyConfig | null;
  login: (config: CompanyConfig) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const STORAGE_KEY = 'company_auth_config';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<CompanyConfig | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const login = (newConfig: CompanyConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const logout = () => {
    setConfig(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ config, login, logout, isAuthenticated: !!config }}>
      {children}
    </AuthContext.Provider>
  );
};

