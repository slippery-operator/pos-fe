import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  isValidName(): boolean {
    const trimmedName = this.clientName.trim();
    return trimmedName.length > 0 && trimmedName.length <= 255;
  }

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

  onSubmit() {
    this.validateName();
    
    if (this.isValidName()) {
      this.clientAdded.emit(this.clientName.trim());
      this.closeModal();
    }
  }

  closeModal() {
    this.show = false;
    this.showChange.emit(false);
    this.clientName = '';
    this.showError = false;
    this.errorMessage = '';
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}