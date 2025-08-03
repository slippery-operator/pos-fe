import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { Role, UserResponse } from '../models/auth.model';

/**
 * Service for role-based access control and UI restrictions
 * Provides methods to check user permissions for different actions
 */
@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(private authService: AuthService) {}

  /**
   * Get current user
   * @returns UserResponse | null
   */
  getCurrentUser(): UserResponse | null {
    return this.authService.currentUser;
  }

  /**
   * Check if current user is a supervisor
   * @returns Observable<boolean>
   */
  isSupervisor(): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        return authState.user?.role === Role.SUPERVISOR;
      })
    );
  }

  /**
   * Check if current user is an operator
   * @returns Observable<boolean>
   */
  isOperator(): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        return authState.user?.role === Role.OPERATOR;
      })
    );
  }

  /**
   * Check if current user can add/create resources
   * Only supervisors can add products, clients, or upload inventory
   * @returns Observable<boolean>
   */
  canCreate(): Observable<boolean> {
    return this.isSupervisor();
  }

  /**
   * Check if current user can upload files
   * Only supervisors can upload inventory or product files
   * @returns Observable<boolean>
   */
  canUpload(): Observable<boolean> {
    return this.isSupervisor();
  }

  /**
   * Check if current user can view reports
   * Only supervisors can access reports
   * @returns Observable<boolean>
   */
  canViewReports(): Observable<boolean> {
    return this.isSupervisor();
  }

  /**
   * Check if current user can edit resources
   * Both supervisors and operators can edit (but operators have limited access)
   * @returns Observable<boolean>
   */
  canEdit(): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        return authState.user?.role === Role.SUPERVISOR || authState.user?.role === Role.OPERATOR;
      })
    );
  }

  /**
   * Check if current user can view a specific resource
   * Both supervisors and operators can view most resources
   * @returns Observable<boolean>
   */
  canView(): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        return authState.user?.role === Role.SUPERVISOR || authState.user?.role === Role.OPERATOR;
      })
    );
  }

  /**
   * Get user role display name
   * @returns string
   */
  getUserRoleDisplayName(): string {
    const user = this.getCurrentUser();
    if (!user) return 'Unknown';
    
    switch (user.role) {
      case Role.SUPERVISOR:
        return 'Supervisor';
      case Role.OPERATOR:
        return 'Operator';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if current user has a specific role
   * @param role - Role to check
   * @returns Observable<boolean>
   */
  hasRole(role: Role): Observable<boolean> {
    return this.authService.authState.pipe(
      map(authState => {
        return authState.user?.role === role;
      })
    );
  }
} 