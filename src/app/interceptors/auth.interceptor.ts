import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * HTTP Interceptor function to add JWT authentication headers to all API requests
 * Automatically includes JWT token in Authorization header for protected routes
 * Handles 401 unauthorized errors globally with token validation
 * 
 * This is a functional interceptor compatible with Angular standalone components
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject required services
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  // Check if the request is for an API endpoint
  const isApiRequest = (url: string): boolean => {
    // Check if URL contains API endpoints
    return url.includes('/api/') || 
           url.includes('/auth') ||
           url.includes('/clients') || 
           url.includes('/products') || 
           url.includes('/inventory') || 
           url.includes('/orders') || 
           url.includes('/reports') || 
           url.includes('/invoice');
  };

  // Check if this is a login or signup request
  const isAuthRequest = (url: string): boolean => {
    return url.includes('/auth/login') || url.includes('/auth/signup');
  };

  // Only add headers for API requests (not for assets, etc.)
  if (isApiRequest(req.url)) {
    const isFormData = req.body instanceof FormData;
    const token = authService.token;
    
    // Prepare headers
    const headers: { [key: string]: string } = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Accept': 'application/json'
    };

    // Add Authorization header with JWT token for non-auth requests
    if (token && !isAuthRequest(req.url)) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Clone the request and add authentication headers
    const authRequest = req.clone({
      setHeaders: headers
    });
    
    // Handle the request and catch 401 errors
    return next(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors globally
        if (error.status === 401 && !isAuthRequest(req.url)) {
          console.log('401 error detected, checking token validity...');
          
          // Check if user should still be authenticated (has valid token)
          if (authService.isAuthenticated && authService.currentUser) {
            console.log('User appears to be authenticated, validating token...');
            
            // Try to validate token
            return authService.validateToken().pipe(
              switchMap(isValid => {
                if (isValid) {
                  console.log('Token is valid, retrying original request...');
                  // Token is valid, retry the original request
                  return next(authRequest);
                } else {
                  console.log('Token validation failed, redirecting to auth...');
                  // Token validation failed, show error and redirect
                  toastService.showError('Your session has expired. Please login again.');
                  authService.clearAuthState();
                  router.navigate(['/auth']);
                  return throwError(() => new Error('Token expired'));
                }
              }),
              catchError(() => {
                console.log('Token validation failed, redirecting to auth...');
                // Token validation failed, redirect to login
                toastService.showError('Your session has expired. Please login again.');
                authService.clearAuthState();
                router.navigate(['/auth']);
                return throwError(() => new Error('Token expired'));
              })
            );
          } else {
            // User is not authenticated, redirect to login
            console.log('User not authenticated, redirecting to auth...');
            toastService.showError('Authentication required. Please login.');
            authService.clearAuthState();
            router.navigate(['/auth']);
            return throwError(() => new Error('Authentication required'));
          }
        }
        
        // For non-401 errors or auth requests, pass them through
        return throwError(() => error);
      })
    );
  }
  
  // For non-API requests, proceed without modification
  return next(req);
};