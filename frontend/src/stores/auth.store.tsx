import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api';
import { LEADERSHIP_ROLES, type AuthUser, type LoginResponse } from '../types';

interface RegisterData {
  organizationName: string;
  organizationSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLeadership: boolean;
  login: (
    username: string,
    password: string,
    organizationId?: string,
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw && localStorage.getItem('accessToken')
      ? (JSON.parse(raw) as AuthUser)
      : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const persistSession = useCallback((res: LoginResponse) => {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (username: string, password: string, organizationId?: string) => {
      persistSession(await authApi.login(username, password, organizationId));
    },
    [persistSession],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      persistSession(await authApi.register(data));
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLeadership:
        user?.roles.some((r) => LEADERSHIP_ROLES.includes(r)) ?? false,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth mora biti znotraj AuthProvider');
  return ctx;
}
