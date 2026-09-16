import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { api, setSession, clearSession, storedUser } from '../utils/api';

const AuthContext = createContext(null);

const EXEC = ['chair', 'vice_chair', 'secretary', 'treasurer'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storedUser());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/v1/auth/me');
      setUser(data.user);
      localStorage.setItem('acm_user', JSON.stringify(data.user));
    } catch {
      setUser(null);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (storedUser()) refresh();
    else setLoading(false);
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/v1/auth/login', { email, password }, { auth: false });
    setSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.post('/v1/auth/register', payload, { auth: false });
    setSession(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refresh,
    setUser,
    role: user?.role || '',
    isExec: !!user && EXEC.includes(user.role),
    isHod: user?.role === 'hod',
    isExpert: user?.role === 'expert',
    isLearner: user?.role === 'scholar' || user?.role === 'fellow',
    canReview: !!user && (EXEC.includes(user.role) || user.role === 'hod'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
