import { createContext } from "react";

import type { User, UserRole, UserStatus } from "@/services/googleSheetsApi";

export interface LoginResult {
  success: boolean;
  status?: UserStatus;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
