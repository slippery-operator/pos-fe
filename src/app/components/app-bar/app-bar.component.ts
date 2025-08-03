import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { UserResponse } from '../../models/auth.model';

/**
 * Application navigation bar component
 * Provides navigation links, user info, and logout functionality
 */
@Component({
  selector: 'app-bar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app-bar.component.html',
  styleUrl: './app-bar.component.css'
})
export class AppBarComponent implements OnInit, OnDestroy {
  @Input() currentRoute: string = '';
  
  currentUser: UserResponse | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    public roleService: RoleService, // Made public for template access
    private router: Router
  ) {}

  /**
   * Check if we're on the auth page
   */
  get isAuthPage(): boolean {
    return this.currentRoute.includes('/auth');
  }

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.authState
      .pipe(takeUntil(this.destroy$))
      .subscribe(authState => {
        this.currentUser = authState.user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle user logout
   */
  onLogout(): void {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth']);
        },
        error: () => {
          // Error handled in service, but still redirect
          this.router.navigate(['/auth']);
        }
      });
  }

  /**
   * Get user's initials for avatar
   */
  getUserInitials(): string {
    if (!this.currentUser || !this.currentUser.name) {
      return 'U';
    }
    return this.currentUser.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Get role badge color
   */
  getRoleBadgeColor(): string {
    if (!this.currentUser) return 'secondary';
    return this.currentUser.role === 'SUPERVISOR' ? 'primary' : 'info';
  }
}
