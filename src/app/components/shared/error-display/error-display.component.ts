import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable error display component
 * Shows error messages with Bootstrap alert styling
 */
@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-display.component.html',
  styleUrl: './error-display.component.css'
})
export class ErrorDisplayComponent {
  /** Error message to display */
  @Input() errorMessage: string = '';
  
  /** Error title (optional) */
  @Input() errorTitle: string = 'Error';
  
  /** Whether to show the error */
  @Input() showError: boolean = false;
  
  /** Function to call when retry button is clicked */
  @Input() onRetry?: () => void;
  
  /** Whether to show retry button */
  @Input() showRetryButton: boolean = false;
} 