import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable loading spinner component
 * Displays a Bootstrap spinner with customizable size and text
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.css'
})
export class LoadingSpinnerComponent {
  /** Text to display below the spinner */
  @Input() loadingText: string = 'Loading...';
  
  /** Size of the spinner: 'sm', 'md', or 'lg' */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  
  /** Whether to show the loading text */
  @Input() showText: boolean = true;
  
  /** Additional CSS classes to apply */
  @Input() customClass: string = '';
} 