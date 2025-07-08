import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Modal component for adding new clients
 * Provides form validation and user feedback
 */
@Component({
  selector: 'add-client-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-client-modal.component.html',
  styleUrls: ['./add-client-modal.component.css']
})
export class AddClientModalComponent {
  @Input() show = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() clientAdded = new EventEmitter<string>();

  clientName = '';
  showError = false;
  errorMessage = '';

  /**
   * Validates if the current client name is valid
   * @returns boolean indicating if the name is valid
   */
  isValidName(): boolean {
    const trimmedName = this.clientName.trim();
    return trimmedName.length > 0 && trimmedName.length <= 255;
  }

  /**
   * Validates the client name and sets error state
   */
  validateName(): void {
    const trimmedName = this.clientName.trim();
    
    if (trimmedName.length === 0) {
      this.showError = true;
      this.errorMessage = 'Client name cannot be empty';
    } else if (trimmedName.length > 255) {
      this.showError = true;
      this.errorMessage = 'Client name cannot exceed 255 characters';
    } else {
      this.showError = false;
      this.errorMessage = '';
    }
  }

  /**
   * Handles form submission
   * Validates the name and emits the client added event if valid
   */
  onSubmit() {
    this.validateName();
    
    if (this.isValidName()) {
      this.clientAdded.emit(this.clientName.trim());
      this.closeModal();
    }
  }

  /**
   * Closes the modal and resets form state
   */
  closeModal() {
    this.show = false;
    this.showChange.emit(false);
    this.resetForm();
  }

  /**
   * Handles backdrop click to close modal
   * @param event - The click event
   */
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Resets the form to initial state
   */
  private resetForm(): void {
    this.clientName = '';
    this.showError = false;
    this.errorMessage = '';
  }

  /**
   * Handles key press events in the input field
   * @param event - The keyboard event
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }
}