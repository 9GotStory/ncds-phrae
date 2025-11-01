import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  googleSheetsApi,
  type SessionInfo,
  type User,
  type UserRole,
} from "@/services/googleSheetsApi";
import { AuthContext, type LoginResult } from "./auth-context";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";
const SESSION_STORAGE_KEY = "session";
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_GRACE_MS = 5_000;
const AUTH_INVALIDATED_EVENT = "auth:invalidated";

const readStorageValue = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key ${key}:`, error);
    return null;
  }
};

const writeStorageValue = (key: string, value: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Failed to write localStorage key ${key}:`, error);
  }
};

const readStorageJson = <T,>(key: string): T | null => {
  const raw = readStorageValue(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key ${key}:`, error);
    writeStorageValue(key, null);
    return null;
  }
};

const writeStorageJson = (key: string, value: unknown) => {
  if (value === null || value === undefined) {
    writeStorageValue(key, null);
    return;
  }

  try {
    writeStorageValue(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to serialise localStorage key ${key}:`, error);
  }
};

const removeStorageItem = (key: string) => {
  writeStorageValue(key, null);
};

const parseTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return Number.NaN;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
};

const isSessionExpired = (session: SessionInfo | null): boolean => {
  if (!session) {
    return false;
  }

  const now = Date.now();
  const idleExpiresAt = parseTimestamp(session.idleExpiresAt);
  const absoluteExpiresAt = parseTimestamp(session.expiresAt);

  if (!Number.isNaN(idleExpiresAt) && idleExpiresAt - SESSION_EXPIRY_GRACE_MS <= now) {
    return true;
  }

  if (!Number.isNaN(absoluteExpiresAt) && absoluteExpiresAt - SESSION_EXPIRY_GRACE_MS <= now) {
    return true;
  }

  return false;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<SessionInfo | null>(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
    setSession(null);
    sessionRef.current = null;
    googleSheetsApi.setAuthToken(null);
    removeStorageItem(USER_STORAGE_KEY);
    removeStorageItem(TOKEN_STORAGE_KEY);
    removeStorageItem(SESSION_STORAGE_KEY);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const initialiseAuth = async () => {
      try {
        const storedUser = readStorageJson<User>(USER_STORAGE_KEY);
        const storedToken = readStorageValue(TOKEN_STORAGE_KEY);
        const storedSession = readStorageJson<SessionInfo>(SESSION_STORAGE_KEY);

        if (storedUser) {
          setUser(storedUser);
        }

        if (storedSession) {
          setSession(storedSession);
          sessionRef.current = storedSession;
        }

        if (storedToken) {
          setToken(storedToken);
          googleSheetsApi.setAuthToken(storedToken);
        } else {
          googleSheetsApi.setAuthToken(null);
        }

        if (!storedToken) {
          clearAuthState();
          return;
        }

        if (isSessionExpired(storedSession)) {
          clearAuthState();
          return;
        }

        const { user: freshUser, session: freshSession } = await googleSheetsApi.getSessionStatus();
        if (!isMounted) {
          return;
        }

        setUser(freshUser);
        setSession(freshSession);
        sessionRef.current = freshSession;
        writeStorageJson(USER_STORAGE_KEY, freshUser);
        writeStorageJson(SESSION_STORAGE_KEY, freshSession);
        if (storedToken) {
          writeStorageValue(TOKEN_STORAGE_KEY, storedToken);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Initial session validation failed:", error);
        // `googleSheetsApi` dispatches auth invalidation events when the server rejects the token.
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialiseAuth();

    return () => {
      isMounted = false;
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAuthInvalidated = () => {
      clearAuthState();
    };

    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);

    return () => {
      window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    const performSessionCheck = async () => {
      if (isCancelled) {
        return;
      }

      const currentSession = sessionRef.current;
      if (isSessionExpired(currentSession)) {
        clearAuthState();
        return;
      }

      try {
        const { user: freshUser, session: freshSession } = await googleSheetsApi.getSessionStatus();
        if (isCancelled) {
          return;
        }

        setUser(freshUser);
        setSession(freshSession);
        sessionRef.current = freshSession;
        writeStorageJson(USER_STORAGE_KEY, freshUser);
        writeStorageJson(SESSION_STORAGE_KEY, freshSession);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        console.error("Periodic session validation failed:", error);
        // The API service will emit an invalidation event if the token is no longer valid.
      }
    };

    void performSessionCheck();
    const intervalId = window.setInterval(performSessionCheck, SESSION_CHECK_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, clearAuthState]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const authResult = await googleSheetsApi.login(username, password);

        if (authResult.success && authResult.user && authResult.token) {
          if (authResult.user.status === "pending") {
            googleSheetsApi.setAuthToken(null);
            clearAuthState();
            return {
              success: false,
              status: authResult.user.status,
              message: authResult.message ?? "บัญชีของคุณกำลังรออนุมัติจากผู้ดูแลระบบ",
            };
          }

          setUser(authResult.user);
          setToken(authResult.token);
          googleSheetsApi.setAuthToken(authResult.token);

          const nextSession = authResult.session ?? null;
          setSession(nextSession);
          sessionRef.current = nextSession;

          writeStorageJson(USER_STORAGE_KEY, authResult.user);
          writeStorageValue(TOKEN_STORAGE_KEY, authResult.token);
          writeStorageJson(SESSION_STORAGE_KEY, nextSession);

          return { success: true };
        }

        const status =
          authResult.user?.status ??
          (authResult.message?.includes("อนุมัติ") ? "pending" : undefined);
        if (status === "pending") {
          googleSheetsApi.setAuthToken(null);
          clearAuthState();
          return {
            success: false,
            status,
            message: authResult.message ?? "บัญชีของคุณกำลังรออนุมัติจากผู้ดูแลระบบ",
          };
        }

        return {
          success: false,
          status,
          message: authResult.message ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        };
      } catch (error) {
        console.error("Login error:", error);
        return {
          success: false,
          message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
        };
      }
    },
    [clearAuthState]
  );

  const logout = useCallback(async () => {
    try {
      await googleSheetsApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const hasRole = useCallback(
    (roles: UserRole[]): boolean => {
      if (!user) {
        return false;
      }
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
