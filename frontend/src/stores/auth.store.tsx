import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api';
import {
  isTwoFactorChallenge,
  LEADERSHIP_ROLES,
  type AuthUser,
  type LoginResponse,
  type TwoFactorChallenge,
} from '../types';

interface RegisterData {
  activationCode: string;
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
  /** Upravitelj platforme — vidi stran /platform (izdaja aktivacijskih kod). */
  isSuperAdmin: boolean;
  /** Vrne izziv, če ima račun vklopljeno 2FA — takrat sledi verify2fa. */
  login: (
    username: string,
    password: string,
    organizationId?: string,
  ) => Promise<TwoFactorChallenge | undefined>;
  /** Drugi korak prijave: TOTP ali rezervna koda. */
  verify2fa: (pendingToken: string, code: string) => Promise<void>;
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
      const res = await authApi.login(username, password, organizationId);
      if (isTwoFactorChallenge(res)) return res;
      persistSession(res);
      return undefined;
    },
    [persistSession],
  );

  const verify2fa = useCallback(
    async (pendingToken: string, code: string) => {
      persistSession(await authApi.verify2fa(pendingToken, code));
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
      isSuperAdmin: user?.roles.includes('super_admin') ?? false,
      login,
      verify2fa,
      register,
      logout,
    }),
    [user, login, verify2fa, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth mora biti znotraj AuthProvider');
  return ctx;
}
