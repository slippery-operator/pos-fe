/**
 * Authentication related models
 * Based on backend API structure
 */

/**
 * User role enumeration
 */
export enum Role {
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR'
}

/**
 * Login form model
 */
export interface LoginForm {
  email: string;
  password: string;
}

/**
 * Signup form model
 */
export interface SignupForm {
  name: string;
  email: string;
  password: string;
}

/**
 * User response model
 */
export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/**
 * Login response model with JWT token
 */
export interface LoginResponse {
  message: string;
  user: UserResponse;
  token: string; // JWT token
}

/**
 * Current user state for app-wide usage
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
} 