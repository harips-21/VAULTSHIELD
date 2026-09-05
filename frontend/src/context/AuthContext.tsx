import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Organization, User } from '../types';

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName?: string) => Promise<void>;
  logout: () => void;
  setOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedOrg = localStorage.getItem('currentOrg');

    if (storedUser && localStorage.getItem('accessToken')) {
      setUser(JSON.parse(storedUser));
      if (storedOrg) {
        setCurrentOrg(JSON.parse(storedOrg));
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = res.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    const defaultOrg = user.memberships?.[0]
      ? { id: user.memberships[0].orgId, name: user.memberships[0].orgName, slug: '' }
      : null;

    if (defaultOrg) {
      localStorage.setItem('currentOrg', JSON.stringify(defaultOrg));
      setCurrentOrg(defaultOrg);
    }

    setUser(user);
  };

  const register = async (email: string, password: string, fullName: string, orgName?: string) => {
    const res = await api.post('/auth/register', { email, password, fullName, orgName });
    const { user, organization, tokens } = res.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('currentOrg', JSON.stringify(organization));

    setUser(user);
    setCurrentOrg(organization);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    api.post('/auth/logout', { refreshToken }).catch(() => {});
    localStorage.clear();
    setUser(null);
    setCurrentOrg(null);
  };

  const setOrganization = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrg', JSON.stringify(org));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
