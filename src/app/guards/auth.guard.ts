import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard to protect routes that require authentication
 * Implements JWT token validation
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Check if user can activate the route
   * @returns Observable<boolean> - true if user is authenticated, false otherwise
   */
  canActivate(): Observable<boolean> {
    return this.authService.authState.pipe(
      switchMap(authState => {
        if (!authState.isAuthenticated) {
          // Not authenticated, redirect to login
          this.router.navigate(['/auth']);
          return of(false);
        }

        // User appears to be authenticated, validate JWT token
        return this.authService.validateToken().pipe(
          map(isValid => {
            if (!isValid) {
              // Token is invalid, redirect to login
              this.router.navigate(['/auth']);
              return false;
            }
            return true;
          }),
          catchError(() => {
            // Error validating token, redirect to login
            this.router.navigate(['/auth']);
            return of(false);
          })
        );
      })
    );
  }
}