import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.model';

/**
 * Role guard to protect routes based on user roles
 * Redirects operators away from supervisor-only routes like reports
 */
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Check if user has the required role to access the route
   * @param route - The route being accessed
   * @returns Observable<boolean> - true if user has access, false otherwise
   */
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        // Check if user is authenticated
        if (!authState.isAuthenticated || !authState.user) {
          this.router.navigate(['/auth']);
          return false;
        }

        // Get the required role from route data
        const requiredRole = route.data?.['role'] as Role;
        
        // If no specific role is required, allow access
        if (!requiredRole) {
          return true;
        }

        // Check if user has the required role
        if (authState.user.role === requiredRole) {
          return true;
        }

        // For operators trying to access supervisor routes, redirect to home
        if (authState.user.role === Role.OPERATOR && requiredRole === Role.SUPERVISOR) {
          this.router.navigate(['/']);
          return false;
        }

        // Default: deny access
        this.router.navigate(['/']);
        return false;
      })
    );
  }
} 