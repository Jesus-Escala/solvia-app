import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setUnauthorizedHandler } from '../lib/api';
import type { AuthResponse, SessionUser } from '../lib/types';
import { tokenStorage } from './tokenStorage';

export interface RegisterInput {
  businessName: string;
  industry?: string;
  name: string;
  email: string;
  password: string;
}

export interface GoogleSignInInput {
  credential: string;
  businessName?: string;
  industry?: string;
}

/** Result of a Google sign-in: signed in, or the business name is still needed. */
export type GoogleSignInResult =
  | { status: 'signed_in' }
  | { status: 'needs_registration'; profile: { email: string; name: string } };

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  googleSignIn: (input: GoogleSignInInput) => Promise<GoogleSignInResult>;
  /** Sets a new password (required after signing in with a temporary one). */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(() =>
    tokenStorage.getAccessToken() ? tokenStorage.getUser() : null,
  );

  const startSession = useCallback(
    (session: AuthResponse) => {
      tokenStorage.setTokens(session.accessToken, session.refreshToken);
      tokenStorage.setUser(session.user);
      queryClient.clear();
      setUser(session.user);
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'admin',
      login: async (email, password) => {
        startSession(await api.public.post<AuthResponse>('/auth/login', { email, password }));
      },
      register: async (input) => {
        startSession(await api.public.post<AuthResponse>('/auth/register', input));
      },
      googleSignIn: async (input) => {
        const result = await api.public.post<
          AuthResponse | { needsRegistration: true; profile: { email: string; name: string } }
        >('/auth/google', input);
        if ('needsRegistration' in result) {
          return { status: 'needs_registration', profile: result.profile };
        }
        startSession(result);
        return { status: 'signed_in' };
      },
      changePassword: async (currentPassword, newPassword) => {
        startSession(
          await api.post<AuthResponse>('/auth/change-password', { currentPassword, newPassword }),
        );
      },
      logout,
    }),
    [user, startSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
