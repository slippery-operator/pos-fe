
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthState, LoginForm, SignupForm, LoginResponse, UserResponse } from '../models/auth.model';
import { ToastService } from './toast.service';

/**
 * Authentication service that handles all auth-related API calls
 * Uses JWT-based authentication with proper error handling
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = 'http://localhost:9000/auth';
  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'user_data';
  
  // BehaviorSubject to maintain auth state across the app
  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  });

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {
    // Check if user is already logged in on app start
    this.checkAuthState();
  }

  /**
   * Get current auth state as observable
   */
  get authState(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get current user
   */
  get currentUser(): UserResponse | null {
    return this.authState$.value.user;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  /**
   * Get JWT token
   */
  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * User signup
   * @param signupForm - signup form data
   * @returns Observable<UserResponse>
   */
  signup(signupForm: SignupForm): Observable<UserResponse> {
    this.updateAuthState({ loading: true, error: null });

    // Normalize email to lowercase and trim whitespace
    const normalizedForm = {
      ...signupForm,
      email: signupForm.email.toLowerCase().trim(),
      name: signupForm.name.trim()
    };

    return this.http.post<UserResponse>(`${this.API_BASE_URL}/signup`, normalizedForm)
      .pipe(
        tap((user: UserResponse) => {
          this.toastService.showSuccess('Account created successfully! Please login to continue.');
          this.updateAuthState({ loading: false, error: null });
        }),
        catchError((error: HttpErrorResponse) => {
          const errorMessage = this.extractErrorMessage(error);
          this.toastService.showError(errorMessage);
          this.updateAuthState({ loading: false, error: errorMessage });
          return throwError(() => error);
        })
      );
  }

  /**
   * User login with JWT token
   * @param loginForm - login form data
   * @returns Observable<LoginResponse>
   */
  login(loginForm: LoginForm): Observable<LoginResponse> {
    this.updateAuthState({ loading: true, error: null });

    // Normalize email to lowercase and trim whitespace
    const normalizedForm = {
      ...loginForm,
      email: loginForm.email.toLowerCase().trim()
    };

    return this.http.post<LoginResponse>(`${this.API_BASE_URL}/login`, normalizedForm)
      .pipe(
        tap((response: LoginResponse) => {
          // Store JWT token and user data
          this.storeAuthData(response.token, response.user);
          
          this.updateAuthState({
            isAuthenticated: true,
            user: response.user,
            loading: false,
            error: null
          });
          this.toastService.showSuccess(`Welcome back, ${response.user.name}!`);
        }),
        catchError((error: HttpErrorResponse) => {
          const errorMessage = this.extractErrorMessage(error);
          this.toastService.showError(errorMessage);
          this.updateAuthState({ loading: false, error: errorMessage });
          return throwError(() => error);
        })
      );
  }

  /**
   * User logout
   * @returns Observable<string>
   */
  logout(): Observable<string> {
    this.updateAuthState({ loading: true, error: null });

    return this.http.post<string>(`${this.API_BASE_URL}/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuthData();
          this.updateAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
          this.toastService.showSuccess('Logged out successfully');
        }),
        catchError((error: HttpErrorResponse) => {
          // Even if logout fails on server, clear local state
          this.clearAuthData();
          this.updateAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: null
          });
          this.toastService.showSuccess('Logged out successfully');
          return throwError(() => error);
        })
      );
  }

  /**
   * Validate JWT token
   * @returns Observable<boolean>
   */
  validateToken(): Observable<boolean> {
    const token = this.token;
    const user = this.currentUser;
    
    if (!token || !user) {
      return of(false);
    }

    // Check if token is expired (basic check)
    if (this.isTokenExpired(token)) {
      this.clearAuthData();
      return of(false);
    }

    // For now, we'll assume the token is valid if it exists and isn't expired
    // In a production system, you might want to validate with the server
    return of(true);
  }

  /**
   * Check if JWT token is expired
   * @param token - JWT token to check
   * @returns boolean - true if expired, false otherwise
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      // If we can't parse the token, consider it expired
      return true;
    }
  }

  /**
   * Check authentication state on app initialization
   */
  private checkAuthState(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userData = localStorage.getItem(this.USER_KEY);
    
    if (token && userData) {
      try {
        const user: UserResponse = JSON.parse(userData);
        
        // Check if token is still valid
        if (!this.isTokenExpired(token)) {
          this.updateAuthState({
            isAuthenticated: true,
            user: user,
            loading: false,
            error: null
          });
        } else {
          // Token expired, clear data
          this.clearAuthData();
        }
      } catch (error) {
        // Invalid user data, clear it
        this.clearAuthData();
      }
    }
  }

  /**
   * Store JWT token and user data
   */
  private storeAuthData(token: string, user: UserResponse): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear JWT token and user data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Update auth state
   */
  private updateAuthState(updates: Partial<AuthState>): void {
    const currentState = this.authState$.value;
    this.authState$.next({
      ...currentState,
      ...updates
    });
  }

  /**
   * Extract error message from HTTP error response
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }
    
    if (error.error && error.error.message) {
      return error.error.message;
    }
    
    if (error.message) {
      return error.message;
    }
    
    // Default error messages based on status code
    switch (error.status) {
      case 400:
        return 'Invalid credentials or data provided';
      case 401:
        return 'Authentication failed. Please check your credentials.';
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.';
      case 404:
        return 'Service not found. Please try again later.';
      case 409:
        return 'User with this email already exists';
      case 500:
        return 'Internal server error. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Public method to clear authentication state (used by interceptor)
   * Called when 401 unauthorized errors occur
   */
  public clearAuthState(): void {
    this.clearAuthData();
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  }
}