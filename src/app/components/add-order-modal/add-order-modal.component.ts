import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { OrderItemForm } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

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

  // Barcode validation state
  barcodeValidationState: { [key: number]: 'pending' | 'valid' | 'invalid' | 'checking' } = {};
  validatedBarcodes: { [key: number]: boolean } = {};

  // LocalStorage key for order items
  private readonly STORAGE_KEY = 'add-order-modal-items';

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Initialize validation state for the first item
    this.barcodeValidationState[0] = 'pending';
    this.validatedBarcodes[0] = false;
    this.loadFromStorage();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load order items from localStorage
   */
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.orderItems = data.orderItems || [{ barcode: '', quantity: 1, mrp: 0 }];
        this.barcodeValidationState = data.barcodeValidationState || { 0: 'pending' };
        this.validatedBarcodes = data.validatedBarcodes || { 0: false };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  /**
   * Save order items to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        orderItems: this.orderItems,
        barcodeValidationState: this.barcodeValidationState,
        validatedBarcodes: this.validatedBarcodes
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Adds a new order item row
   */
  addOrderItem() {
    const newIndex = this.orderItems.length;
    this.orderItems.push({ barcode: '', quantity: 1, mrp: 0 });
    this.barcodeValidationState[newIndex] = 'pending';
    this.validatedBarcodes[newIndex] = false;
    this.saveToStorage();
    this.toastService.showSuccess('New order item added successfully');
  }

  /**
   * Removes an order item row
   * @param index - Index of the item to remove
   */
  removeOrderItem(index: number) {
    if (this.orderItems.length > 1) {
      this.orderItems.splice(index, 1);
      
      // Clean up validation state for removed item
      delete this.barcodeValidationState[index];
      delete this.validatedBarcodes[index];
      
      // Reindex validation states for items after the removed one
      const newBarcodeValidationState: { [key: number]: 'pending' | 'valid' | 'invalid' | 'checking' } = {};
      const newValidatedBarcodes: { [key: number]: boolean } = {};
      
      Object.keys(this.barcodeValidationState).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex < index) {
          newBarcodeValidationState[keyIndex] = this.barcodeValidationState[keyIndex];
          newValidatedBarcodes[keyIndex] = this.validatedBarcodes[keyIndex];
        } else if (keyIndex > index) {
          newBarcodeValidationState[keyIndex - 1] = this.barcodeValidationState[keyIndex];
          newValidatedBarcodes[keyIndex - 1] = this.validatedBarcodes[keyIndex];
        }
      });
      
      this.barcodeValidationState = newBarcodeValidationState;
      this.validatedBarcodes = newValidatedBarcodes;
      
      this.validateForm();
      this.saveToStorage();
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
      } else if (item.barcode.trim().length > 50) {
        this.setFieldError('barcode', index, 'Barcode cannot exceed 50 characters');
        isValid = false;
      } else {
        // Check for duplicate barcodes
        const duplicateIndex = this.findDuplicateBarcode(item.barcode.trim(), index);
        if (duplicateIndex !== -1) {
          this.setFieldError('barcode', index, `Duplicate barcode found at row ${duplicateIndex + 1}`);
          isValid = false;
        }
      }

      // Quantity validation
      const quantity = Number(item.quantity);
      if (!item.quantity || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        this.setFieldError('quantity', index, 'Quantity must be a positive whole number');
        isValid = false;
      }

      // MRP validation
      const mrp = Number(item.mrp);
      if (!item.mrp || isNaN(mrp) || mrp <= 0) {
        this.setFieldError('mrp', index, 'MRP must be a positive number');
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Handles form submission
   */
  async onSubmit() {
    if (this.validateForm()) {
      // Create a copy of order items with trimmed values
      const cleanOrderItems: OrderItemForm[] = this.orderItems.map(item => ({
        barcode: item.barcode.trim(),
        quantity: item.quantity,
        mrp: item.mrp
      }));

      this.orderCreated.emit(cleanOrderItems);
      this.closeModal();
    } else {
      this.toastService.showError('Please fix the form errors before submitting');
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
    this.barcodeValidationState = { 0: 'pending' };
    this.validatedBarcodes = { 0: false };
    this.clearErrors();
    this.saveToStorage();
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
   * Validates barcode on blur (when user leaves the input)
   * @param index - Index of the item
   */
  onBarcodeBlur(index: number): void {
    const item = this.orderItems[index];
    const barcode = item.barcode.trim();
    
    if (!barcode) {
      this.barcodeValidationState[index] = 'pending';
      this.validatedBarcodes[index] = false;
      this.clearFieldError('barcode', index);
      this.saveToStorage();
      return;
    }

    // Check for duplicate barcodes first
    const duplicateIndex = this.findDuplicateBarcode(barcode, index);
    if (duplicateIndex !== -1) {
      this.barcodeValidationState[index] = 'invalid';
      this.validatedBarcodes[index] = false;
      this.setFieldError('barcode', index, `Duplicate barcode found at row ${duplicateIndex + 1}`);
      this.toastService.showError(`Duplicate barcode found at row ${duplicateIndex + 1}`);
      this.saveToStorage();
      return;
    }

    this.barcodeValidationState[index] = 'checking';
    this.clearFieldError('barcode', index);

    this.orderService.validateBarcode(barcode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isValid) => {
          if (isValid) {
            this.barcodeValidationState[index] = 'valid';
            this.validatedBarcodes[index] = true;
            this.clearFieldError('barcode', index);
          } else {
            this.barcodeValidationState[index] = 'invalid';
            this.validatedBarcodes[index] = false;
            this.setFieldError('barcode', index, `Product with barcode: ${barcode} not found`);
            this.toastService.showError(`Product with barcode: ${barcode} not found`);
          }
          this.saveToStorage();
        },
        error: (error) => {
          this.barcodeValidationState[index] = 'invalid';
          this.validatedBarcodes[index] = false;
          
          // Extract the exact error message from backend
          let errorMessage = `Product with barcode: ${barcode} not found`;
          if (error && error.message) {
            errorMessage = error.message;
          }
          
          this.setFieldError('barcode', index, errorMessage);
          this.toastService.showError(errorMessage);
          this.saveToStorage();
        }
      });
  }

  /**
   * Finds duplicate barcode in the order items
   * @param barcode - Barcode to check
   * @param currentIndex - Current item index (to exclude from search)
   * @returns Index of duplicate barcode or -1 if not found
   */
  private findDuplicateBarcode(barcode: string, currentIndex: number): number {
    return this.orderItems.findIndex((item, index) => 
      index !== currentIndex && 
      item.barcode.trim().toLowerCase() === barcode.toLowerCase()
    );
  }

  /**
   * Validates barcode on input for duplicate checking
   * @param index - Index of the item
   */
  onBarcodeInput(index: number): void {
    const item = this.orderItems[index];
    const barcode = item.barcode.trim();
    
    if (!barcode) {
      this.clearFieldError('barcode', index);
      this.saveToStorage();
      return;
    }

    // Check for duplicate barcodes
    const duplicateIndex = this.findDuplicateBarcode(barcode, index);
    if (duplicateIndex !== -1) {
      this.setFieldError('barcode', index, `Duplicate barcode found at row ${duplicateIndex + 1}`);
    } else {
      this.clearFieldError('barcode', index);
    }
    
    this.saveToStorage();
  }

  /**
   * Validates a specific field on input (for quantity and MRP)
   * @param fieldName - Name of the field
   * @param index - Index of the item
   */
  validateField(fieldName: string, index: number): void {
    const item = this.orderItems[index];
    
    switch (fieldName) {
      case 'quantity':
        const quantity = Number(item.quantity);
        if (!item.quantity || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity) || !this.isValidNumber(item.quantity.toString())) {
          this.setFieldError('quantity', index, 'Quantity must be a positive whole number');
        } else if (quantity > 999999) {
          this.setFieldError('quantity', index, 'Quantity cannot exceed 999,999');
        } else {
          this.clearFieldError('quantity', index);
        }
        break;
      case 'mrp':
        const mrp = Number(item.mrp);
        if (!item.mrp || isNaN(mrp) || mrp <= 0 || !this.isValidNumber(item.mrp.toString())) {
          this.setFieldError('mrp', index, 'MRP must be a positive number');
        } else if (mrp > 999999) {
          this.setFieldError('mrp', index, 'MRP cannot exceed 999,999');
        } else {
          this.clearFieldError('mrp', index);
        }
        break;
    }
    this.saveToStorage();
  }

  /**
   * Handles keydown events for quantity inputs (integers only)
   * @param event - Keyboard event
   */
  onQuantityKeyDown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const key = event.key;
    
    // Allow control keys
    if (allowedKeys.includes(key) || event.ctrlKey || event.metaKey) {
      return;
    }
    
    // Allow only digits for quantity (no decimal point)
    if (!/[0-9]/.test(key)) {
      event.preventDefault();
      return;
    }
    
    // Prevent scientific notation (e, E, +, -)
    if (['e', 'E', '+', '-', '.'].includes(key)) {
      event.preventDefault();
      return;
    }
  }

  /**
   * Handles keydown events for number inputs to prevent invalid characters
   * @param event - Keyboard event
   */
  onNumberKeyDown(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const key = event.key;
    
    // Allow control keys
    if (allowedKeys.includes(key) || event.ctrlKey || event.metaKey) {
      return;
    }
    
    // Allow digits and decimal point
    if (!/[0-9.]/.test(key)) {
      event.preventDefault();
      return;
    }
    
    // Prevent multiple decimal points
    const input = event.target as HTMLInputElement;
    if (key === '.' && input.value.includes('.')) {
      event.preventDefault();
      return;
    }
    
    // Prevent scientific notation (e, E, +, -)
    if (['e', 'E', '+', '-'].includes(key)) {
      event.preventDefault();
      return;
    }
  }

  /**
   * Validates if a string represents a valid number without scientific notation
   * @param value - String to validate
   * @returns boolean indicating if the value is a valid number
   */
  private isValidNumber(value: string): boolean {
    if (!value || value.trim() === '') return false;
    
    // Check for scientific notation
    if (/[eE]/.test(value)) return false;
    
    // Check if it's a valid number
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
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
   * Gets the validation state for a barcode
   * @param index - Index of the item
   * @returns Validation state
   */
  getBarcodeValidationState(index: number): 'pending' | 'valid' | 'invalid' | 'checking' {
    return this.barcodeValidationState[index] || 'pending';
  }

  /**
   * Checks if barcode is being validated
   * @param index - Index of the item
   * @returns boolean indicating if barcode is being checked
   */
  isBarcodeChecking(index: number): boolean {
    return this.barcodeValidationState[index] === 'checking';
  }

  /**
   * Checks if barcode is valid
   * @param index - Index of the item
   * @returns boolean indicating if barcode is valid
   */
  isBarcodeValid(index: number): boolean {
    return this.barcodeValidationState[index] === 'valid';
  }

  /**
   * Checks if barcode is invalid
   * @param index - Index of the item
   * @returns boolean indicating if barcode is invalid
   */
  isBarcodeInvalid(index: number): boolean {
    return this.barcodeValidationState[index] === 'invalid';
  }

  /**
   * Checks if the form is valid for submission
   * @returns boolean indicating if the form is valid
   */
  isFormValid(): boolean {
    return this.orderItems.every((item, index) => {
      const quantity = Number(item.quantity);
      const mrp = Number(item.mrp);
      
      return item.barcode.trim() && 
             item.barcode.trim().length <= 50 &&
             quantity > 0 && 
             Number.isInteger(quantity) &&
             quantity <= 999999 &&
             mrp > 0 &&
             mrp <= 999999 &&
             this.isValidNumber(item.quantity.toString()) &&
             this.isValidNumber(item.mrp.toString()) &&
             !this.hasFieldError('barcode', index) &&
             !this.hasFieldError('quantity', index) &&
             !this.hasFieldError('mrp', index) &&
             this.isBarcodeValid(index);
    });
  }

  /**
   * Clears the barcode field and resets its validation state
   * @param index - Index of the item to clear
   */
  clearBarcodeField(index: number): void {
    this.orderItems[index].barcode = '';
    this.barcodeValidationState[index] = 'pending';
    this.validatedBarcodes[index] = false;
    this.clearFieldError('barcode', index);
    this.saveToStorage();
  }
} 