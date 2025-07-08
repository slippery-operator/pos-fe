import { Injectable } from '@angular/core';

/**
 * Simple toast service for handling notifications throughout the application
 * Uses custom CSS animations and doesn't require external packages
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor() {}

  /**
   * Shows a success toast notification
   * @param message - The message to display
   * @param title - Optional title for the toast
   */
  showSuccess(message: string, title: string = 'Success'): void {
    this.showToast(message, 'success', title);
  }

  /**
   * Shows an error toast notification
   * @param message - The error message to display
   * @param title - Optional title for the toast
   */
  showError(message: string, title: string = 'Error'): void {
    this.showToast(message, 'error', title);
  }

  /**
   * Shows a warning toast notification
   * @param message - The warning message to display
   * @param title - Optional title for the toast
   */
  showWarning(message: string, title: string = 'Warning'): void {
    this.showToast(message, 'warning', title);
  }

  /**
   * Shows an info toast notification
   * @param message - The info message to display
   * @param title - Optional title for the toast
   */
  showInfo(message: string, title: string = 'Info'): void {
    this.showToast(message, 'info', title);
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
   * Shows a toast notification
   * @param message - The message to display
   * @param type - The type of toast (success, error, warning, info)
   * @param title - Optional title for the toast
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info', title?: string): void {
    const container = this.getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const content = title 
      ? `<strong>${title}</strong><br>${message}`
      : message;
    
    toast.innerHTML = content;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #666;
    `;
    closeBtn.onclick = () => this.removeToast(toast);
    
    toast.style.position = 'relative';
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      this.removeToast(toast);
    }, 5000);
  }

  /**
   * Gets or creates the toast container
   * @returns The toast container element
   */
  private getToastContainer(): HTMLElement {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Removes a toast notification
   * @param toast - The toast element to remove
   */
  private removeToast(toast: HTMLElement): void {
    if (toast.parentNode) {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }
} 