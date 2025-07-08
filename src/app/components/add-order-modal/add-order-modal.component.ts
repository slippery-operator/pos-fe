import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { OrderItemForm } from '../../models/order.model';

/**
 * Modal component for adding new orders
 * Allows adding multiple order items with barcode, quantity, and MRP
 */
@Component({
  selector: 'add-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-order-modal.component.html',
  styleUrls: ['./add-order-modal.component.css']
})
export class AddOrderModalComponent implements OnInit, OnDestroy {
  @Input() show = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() orderCreated = new EventEmitter<OrderItemForm[]>();

  // Order items array
  orderItems: OrderItemForm[] = [
    { barcode: '', quantity: 1, mrp: 0 }
  ];

  // Form validation
  showError = false;
  errorMessage = '';
  fieldErrors: { [key: string]: { [key: number]: string } } = {};

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit() {
    // Component initialization
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Adds a new order item row
   */
  addOrderItem() {
    this.orderItems.push({ barcode: '', quantity: 1, mrp: 0 });
  }

  /**
   * Removes an order item row
   * @param index - Index of the item to remove
   */
  removeOrderItem(index: number) {
    if (this.orderItems.length > 1) {
      this.orderItems.splice(index, 1);
      this.validateForm();
    }
  }

  /**
   * Validates the entire form
   * @returns boolean indicating if the form is valid
   */
  validateForm(): boolean {
    this.clearErrors();
    let isValid = true;

    this.orderItems.forEach((item, index) => {
      // Barcode validation
      if (!item.barcode.trim()) {
        this.setFieldError('barcode', index, 'Barcode cannot be empty');
        isValid = false;
      }

      // Quantity validation
      if (!item.quantity || item.quantity <= 0) {
        this.setFieldError('quantity', index, 'Quantity must be greater than 0');
        isValid = false;
      }

      // MRP validation
      if (!item.mrp || item.mrp <= 0) {
        this.setFieldError('mrp', index, 'MRP must be greater than 0');
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Handles form submission
   */
  onSubmit() {
    if (this.validateForm()) {
      // Create a copy of order items with trimmed values
      const cleanOrderItems: OrderItemForm[] = this.orderItems.map(item => ({
        barcode: item.barcode.trim(),
        quantity: item.quantity,
        mrp: item.mrp
      }));

      this.orderCreated.emit(cleanOrderItems);
      this.closeModal();
    }
  }

  /**
   * Closes the modal and resets the form
   */
  closeModal() {
    this.showChange.emit(false);
    this.resetForm();
  }

  /**
   * Handles backdrop click to close modal
   * @param event - Click event
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
    this.orderItems = [{ barcode: '', quantity: 1, mrp: 0 }];
    this.clearErrors();
  }

  /**
   * Clears all field errors
   */
  private clearErrors(): void {
    this.fieldErrors = {};
    this.showError = false;
    this.errorMessage = '';
  }

  /**
   * Sets a field error for a specific item index
   * @param fieldName - Name of the field
   * @param index - Index of the item
   * @param error - Error message
   */
  private setFieldError(fieldName: string, index: number, error: string): void {
    if (!this.fieldErrors[fieldName]) {
      this.fieldErrors[fieldName] = {};
    }
    this.fieldErrors[fieldName][index] = error;
  }

  /**
   * Checks if a field has an error
   * @param fieldName - Name of the field
   * @param index - Index of the item
   * @returns boolean indicating if the field has an error
   */
  hasFieldError(fieldName: string, index: number): boolean {
    return !!(this.fieldErrors[fieldName] && this.fieldErrors[fieldName][index]);
  }

  /**
   * Gets the error message for a field
   * @param fieldName - Name of the field
   * @param index - Index of the item
   * @returns Error message or empty string
   */
  getFieldError(fieldName: string, index: number): string {
    return this.fieldErrors[fieldName]?.[index] || '';
  }

  /**
   * Validates a specific field on input
   * @param fieldName - Name of the field
   * @param index - Index of the item
   */
  validateField(fieldName: string, index: number): void {
    const item = this.orderItems[index];
    
    switch (fieldName) {
      case 'barcode':
        if (!item.barcode.trim()) {
          this.setFieldError('barcode', index, 'Barcode cannot be empty');
        } else {
          this.clearFieldError('barcode', index);
        }
        break;
      case 'quantity':
        if (!item.quantity || item.quantity <= 0) {
          this.setFieldError('quantity', index, 'Quantity must be greater than 0');
        } else {
          this.clearFieldError('quantity', index);
        }
        break;
      case 'mrp':
        if (!item.mrp || item.mrp <= 0) {
          this.setFieldError('mrp', index, 'MRP must be greater than 0');
        } else {
          this.clearFieldError('mrp', index);
        }
        break;
    }
  }

  /**
   * Clears a specific field error
   * @param fieldName - Name of the field
   * @param index - Index of the item
   */
  private clearFieldError(fieldName: string, index: number): void {
    if (this.fieldErrors[fieldName]) {
      delete this.fieldErrors[fieldName][index];
    }
  }

  /**
   * Checks if the form is valid for submission
   * @returns boolean indicating if the form is valid
   */
  isFormValid(): boolean {
    return this.orderItems.every((item, index) => {
      return item.barcode.trim() && 
             item.quantity > 0 && 
             item.mrp > 0 &&
             !this.hasFieldError('barcode', index) &&
             !this.hasFieldError('quantity', index) &&
             !this.hasFieldError('mrp', index);
    });
  }
} 