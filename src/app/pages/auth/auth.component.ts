import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginForm, SignupForm } from '../../models/auth.model';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';

/**
 * Authentication component that handles both login and signup
 * Clean, professional UI with proper form validation
 * No app-bar as specified in requirements
 */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit, OnDestroy {
  // Form management
  loginForm: FormGroup;
  signupForm: FormGroup;
  
  // UI state
  isLoginMode = true;
  isLoading = false;
  
  // Password visibility state
  showLoginPassword = false;
  showSignupPassword = false;
  
  // Component cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize forms
    this.loginForm = this.initializeLoginForm();
    this.signupForm = this.initializeSignupForm();
  }

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.authState
      .pipe(takeUntil(this.destroy$))
      .subscribe(authState => {
        this.isLoading = authState.loading;
        
        // Redirect if already authenticated
        if (authState.isAuthenticated) {
          this.router.navigate(['/']);
        }
      });
      // this.loginForm.reset();
      // this.signupForm.reset();

      // this.loginForm.patchValue({
      //   email: '',
      //   password: ''
      // });
    
      // this.signupForm.patchValue({
      //   name: '',
      //   email: '',
      //   password: ''
      // });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize login form with validation
   */
private initializeLoginForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Initialize signup form with validation
   */
  private initializeSignupForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Toggles between login and signup modes
   */
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    
    // Clear any existing errors when switching modes
    this.loginForm.reset();
    this.signupForm.reset();
    
    // Re-initialize forms to ensure proper validation state
    this.loginForm = this.initializeLoginForm();
    this.signupForm = this.initializeSignupForm();
  }

  /**
   * Toggles login password visibility
   */
  toggleLoginPasswordVisibility(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  /**
   * Toggles signup password visibility
   */
  toggleSignupPasswordVisibility(): void {
    this.showSignupPassword = !this.showSignupPassword;
  }

  /**
   * Handle login form submission
   */
  onLoginSubmit(): void {
    if (this.loginForm.valid) {
      const loginData: LoginForm = this.loginForm.value;
      
      this.authService.login(loginData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Success handled in service (shows toast and redirects)
            this.router.navigate(['/']);
          },
          error: () => {
            // Error handled in service (shows toast)
            this.loginForm.reset();
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.loginForm);
    }
  }

  /**
   * Handle signup form submission
   */
  onSignupSubmit(): void {
    if (this.signupForm.valid) {
      const signupData: SignupForm = this.signupForm.value;
      
      this.authService.signup(signupData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Success handled in service (shows toast)
            // Switch to login mode after successful signup
            this.isLoginMode = true;
            this.signupForm.reset();
            // Pre-fill email in login form
            this.loginForm.patchValue({ email: signupData.email });
          },
          error: () => {
            // Error handled in service (shows toast)
            // Don't reset form so user can correct errors
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.signupForm);
    }
  }

  /**
   * Mark all form fields as touched to trigger validation display
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Get form control for easier template access
   */
  getLoginControl(controlName: string) {
    return this.loginForm.get(controlName);
  }

  /**
   * Get form control for easier template access
   */
  getSignupControl(controlName: string) {
    return this.signupForm.get(controlName);
  }

  /**
   * Check if login form field has error
   */
  hasLoginError(controlName: string): boolean {
    const control = this.getLoginControl(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Check if signup form field has error
   */
  hasSignupError(controlName: string): boolean {
    const control = this.getSignupControl(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get login form field error message
   */
  getLoginErrorMessage(controlName: string): string {
    const control = this.getLoginControl(controlName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['minlength']) {
        if (controlName === 'password') return '';
        return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  /**
   * Get signup form field error message
   */
  getSignupErrorMessage(controlName: string): string {
    const control = this.getSignupControl(controlName);
    if (control && control.errors) {
      if (control.errors['required']) {
        return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['minlength']) {
        return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
} 