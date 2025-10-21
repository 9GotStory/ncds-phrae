import { useEffect, useState, type ReactNode } from "react";

import { googleSheetsApi, type User, type UserRole } from "@/services/googleSheetsApi";
import { AuthContext, type LoginResult } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser) as User);
      }
    } catch (error) {
      console.error("Error parsing stored user:", error);
      localStorage.removeItem("user");
    }

    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      googleSheetsApi.setAuthToken(storedToken);
    } else {
      googleSheetsApi.setAuthToken(null);
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const authResult = await googleSheetsApi.login(username, password);

      if (authResult.success && authResult.user && authResult.token) {
        if (authResult.user.status === "pending") {
          googleSheetsApi.setAuthToken(null);
          setUser(null);
          setToken(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          return {
            success: false,
            status: authResult.user.status,
            message: authResult.message ?? "บัญชีของคุณกำลังรออนุมัติจากผู้ดูแลระบบ",
          };
        }

        setUser(authResult.user);
        setToken(authResult.token);
        googleSheetsApi.setAuthToken(authResult.token);
        localStorage.setItem("user", JSON.stringify(authResult.user));
        localStorage.setItem("token", authResult.token);
        return { success: true };
      }

      const status =
        authResult.user?.status ??
        (authResult.message?.includes("อนุมัติ") ? "pending" : undefined);
      if (status === "pending") {
        googleSheetsApi.setAuthToken(null);
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
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
  };

  const logout = async () => {
    try {
      await googleSheetsApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setToken(null);
      googleSheetsApi.setAuthToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
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
