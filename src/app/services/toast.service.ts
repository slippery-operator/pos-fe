import { Injectable } from '@angular/core';

/**
 * Enhanced toast service for handling notifications throughout the application
 * Uses Bootstrap 5 toast components with proper styling and behavior
 * Success toasts auto-dismiss after 3 seconds
 * Error toasts require manual dismissal
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor() {}

  /**
   * Shows a success toast notification (auto-dismisses after 3 seconds)
   * @param message - The message to display
   * @param title - Optional title for the toast
   */
  showSuccess(message: string, title: string = 'Success'): void {
    this.showBootstrapToast(message, 'success', title, 3000);
  }

  /**
   * Shows an error toast notification (manual dismiss only)
   * @param message - The error message to display
   * @param title - Optional title for the toast
   */
  showError(message: string, title: string = 'Error'): void {
    this.showBootstrapToast(message, 'danger', title, 0);
  }

  /**
   * Shows a warning toast notification (auto-dismisses after 5 seconds)
   * @param message - The warning message to display
   * @param title - Optional title for the toast
   */
  showWarning(message: string, title: string = 'Warning'): void {
    this.showBootstrapToast(message, 'warning', title, 5000);
  }

  /**
   * Shows an info toast notification (auto-dismisses after 4 seconds)
   * @param message - The info message to display
   * @param title - Optional title for the toast
   */
  showInfo(message: string, title: string = 'Info'): void {
    this.showBootstrapToast(message, 'info', title, 10000);
  }

  /**
   * Clears all toast notifications
   */
  clearAll(): void {
    const container = this.getToastContainer();
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Shows a Bootstrap toast notification
   * @param message - The message to display
   * @param type - The Bootstrap color variant (success, danger, warning, info)
   * @param title - Optional title for the toast
   * @param autoDismiss - Auto-dismiss time in milliseconds (0 = manual dismiss only)
   */
  private showBootstrapToast(
    message: string, 
    type: 'success' | 'danger' | 'warning' | 'info', 
    title: string, 
    autoDismiss: number
  ): void {
    const container = this.getToastContainer();
    
    // Create toast element with proper Bootstrap structure
    const toastElement = document.createElement('div');
    toastElement.className = `toast fade show border-0 shadow-sm mb-3`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.style.pointerEvents = 'auto'; // Allow clicking on individual toasts
    
    // Set toast content with proper Bootstrap styling
    toastElement.innerHTML = `
      <div class="toast-header bg-${type} text-white border-0">
        <div class="d-flex align-items-center">
          <i class="bi bi-${this.getIconForType(type)} me-2"></i>
          <strong class="me-auto">${title}</strong>
        </div>
        ${type === 'danger' || type === 'warning' ? 
          '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>' : 
          ''
        }
      </div>
      <div class="toast-body p-3">
        ${message}
      </div>
    `;

    // Add toast to container
    container.appendChild(toastElement);

    // Set up close button functionality (only for error and warning toasts)
    const closeButton = toastElement.querySelector('.btn-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.removeToast(toastElement);
      });
    }

    // Auto-dismiss for success toasts or specified duration
    if (autoDismiss > 0) {
      setTimeout(() => {
        this.removeToast(toastElement);
      }, autoDismiss);
    }
  }

  /**
   * Gets the appropriate Bootstrap icon for the toast type
   */
  private getIconForType(type: 'success' | 'danger' | 'warning' | 'info'): string {
    switch (type) {
      case 'success':
        return 'check-circle-fill';
      case 'danger':
        return 'exclamation-triangle-fill';
      case 'warning':
        return 'exclamation-triangle-fill';
      case 'info':
        return 'info-circle-fill';
      default:
        return 'info-circle-fill';
    }
  }

  /**
   * Gets or creates the toast container positioned at top-right
   * @returns The toast container element
   */
  private getToastContainer(): HTMLElement {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '10000'; // Higher than modal z-index (1055)
      container.style.pointerEvents = 'none'; // Prevent interference with modal interactions
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Removes a toast notification with fade-out animation
   * @param toast - The toast element to remove
   */
  private removeToast(toast: HTMLElement): void {
    if (toast.parentNode) {
      // Add fade-out animation
      toast.classList.remove('show');
      toast.classList.add('hide');
      
      // Remove element after animation completes
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }
} 