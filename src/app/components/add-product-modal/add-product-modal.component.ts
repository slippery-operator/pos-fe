import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ProductRequest } from '../../models/product.model';
import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';

/**
 * Modal component for adding new products
 * Provides both single product addition and bulk TSV upload
 */
@Component({
  selector: 'add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-product-modal.component.html',
  styleUrls: ['./add-product-modal.component.css']
})
export class AddProductModalComponent implements OnInit, OnDestroy {
  @Input() show = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() productAdded = new EventEmitter<ProductRequest>();
  @Output() productsUploaded = new EventEmitter<File>();

  // Tab management
  activeTab: 'single' | 'bulk' = 'single';

  // Single product form
  barcode = '';
  selectedClientId: number | null = null;
  productName = '';
  mrp: number | null = null;
  imageUrl = '';

  // Bulk upload
  selectedFile: File | null = null;

  // Form validation
  showError = false;
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};

  // Client list for dropdown
  clients: Client[] = [];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(private clientService: ClientService) {}

  ngOnInit() {
    this.loadClients();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all clients for the dropdown
   */
  loadClients() {
    this.clientService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients: Client[]) => {
          this.clients = clients;
        },
        error: (error: any) => {
          console.error('Error loading clients:', error);
        }
      });
  }

  /**
   * Checks if the single product form is valid
   * @returns boolean indicating if the form is valid
   */
  isSingleFormValid(): boolean {
    const trimmedBarcode = this.barcode.trim();
    const trimmedName = this.productName.trim();
    
    return trimmedBarcode.length > 0 && 
           this.selectedClientId !== null && 
           trimmedName.length > 0 && 
           this.mrp !== null && 
           this.mrp > 0;
  }

  /**
   * Checks if the bulk upload form is valid
   * @returns boolean indicating if the form is valid
   */
  isBulkFormValid(): boolean {
    return this.selectedFile !== null && 
           this.selectedFile.name.toLowerCase().endsWith('.tsv');
  }

  /**
   * Validates the single product form
   */
  validateSingleForm(): boolean {
    this.clearErrors();
    let isValid = true;

    // Barcode validation
    if (!this.barcode.trim()) {
      this.fieldErrors['barcode'] = 'Barcode cannot be empty';
      isValid = false;
    }

    // Client validation
    if (!this.selectedClientId) {
      this.fieldErrors['clientId'] = 'Please select a client';
      isValid = false;
    }

    // Product name validation
    if (!this.productName.trim()) {
      this.fieldErrors['name'] = 'Product name cannot be empty';
      isValid = false;
    }

    // MRP validation
    if (!this.mrp || this.mrp <= 0) {
      this.fieldErrors['mrp'] = 'MRP must be a positive number';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validates the bulk upload form
   */
  validateBulkForm(): boolean {
    this.clearErrors();
    
    if (!this.selectedFile) {
      this.fieldErrors['file'] = 'Please select a TSV file';
      return false;
    }

    if (!this.selectedFile.name.toLowerCase().endsWith('.tsv')) {
      this.fieldErrors['file'] = 'Please select a valid TSV file';
      return false;
    }

    return true;
  }

  /**
   * Handles single product form submission
   */
  onSubmitSingle() {
    if (this.validateSingleForm()) {
      const productRequest: ProductRequest = {
        barcode: this.barcode.trim(),
        clientId: this.selectedClientId!,
        name: this.productName.trim(),
        mrp: this.mrp!,
        imageUrl: this.imageUrl.trim() || undefined
      };

      this.productAdded.emit(productRequest);
      this.closeModal();
    }
  }

  /**
   * Handles bulk upload form submission
   */
  onSubmitBulk() {
    if (this.validateBulkForm() && this.selectedFile) {
      this.productsUploaded.emit(this.selectedFile);
      this.closeModal();
    }
  }

  /**
   * Handles file selection for bulk upload
   * @param event - File input change event
   */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.validateFile();
    }
  }

  /**
   * Downloads the sample TSV file
   */
  downloadSampleTsv() {
    const link = document.createElement('a');
    link.href = '/products.tsv';
    link.download = 'products.tsv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    this.activeTab = 'single';
    this.barcode = '';
    this.selectedClientId = null;
    this.productName = '';
    this.mrp = null;
    this.imageUrl = '';
    this.selectedFile = null;
    this.clearErrors();
  }

  /**
   * Clears all error states
   */
  private clearErrors(): void {
    this.showError = false;
    this.errorMessage = '';
    this.fieldErrors = {};
  }

  /**
   * Clears error for a specific field
   * @param fieldName - Name of the field to clear error for
   */
  private clearFieldError(fieldName: string): void {
    delete this.fieldErrors[fieldName];
  }

  /**
   * Checks if a field has an error
   * @param fieldName - Name of the field to check
   * @returns boolean indicating if the field has an error
   */
  hasFieldError(fieldName: string): boolean {
    return !!this.fieldErrors[fieldName];
  }

  /**
   * Gets error message for a field
   * @param fieldName - Name of the field to get error for
   * @returns Error message for the field
   */
  getFieldError(fieldName: string): string {
    return this.fieldErrors[fieldName] || '';
  }

  /**
   * Handles key press events in input fields
   * @param event - The keyboard event
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.activeTab === 'single') {
        this.onSubmitSingle();
      } else {
        this.onSubmitBulk();
      }
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  }

  /**
   * Validates the barcode field and sets error state
   */
  validateBarcode(): void {
    const trimmedBarcode = this.barcode.trim();
    
    if (trimmedBarcode.length === 0) {
      this.fieldErrors['barcode'] = 'Barcode cannot be empty';
    } else {
      this.clearFieldError('barcode');
    }
  }

  /**
   * Validates the client selection and sets error state
   */
  validateClient(): void {
    if (!this.selectedClientId) {
      this.fieldErrors['clientId'] = 'Please select a client';
    } else {
      this.clearFieldError('clientId');
    }
  }

  /**
   * Validates the product name field and sets error state
   */
  validateProductName(): void {
    const trimmedName = this.productName.trim();
    
    if (trimmedName.length === 0) {
      this.fieldErrors['name'] = 'Product name cannot be empty';
    } else if (trimmedName.length > 255) {
      this.fieldErrors['name'] = 'Product name cannot exceed 255 characters';
    } else {
      this.clearFieldError('name');
    }
  }

  /**
   * Validates the MRP field and sets error state
   */
  validateMrp(): void {
    if (!this.mrp || this.mrp <= 0) {
      this.fieldErrors['mrp'] = 'MRP must be a positive number';
    } else {
      this.clearFieldError('mrp');
    }
  }

  /**
   * Validates the file selection and sets error state
   */
  validateFile(): void {
    if (!this.selectedFile) {
      this.fieldErrors['file'] = 'Please select a TSV file';
    } else if (!this.selectedFile.name.toLowerCase().endsWith('.tsv')) {
      this.fieldErrors['file'] = 'Please select a valid TSV file';
    } else {
      this.clearFieldError('file');
    }
  }

  /**
   * Gets the selected client name for display
   * @returns Selected client name or empty string
   */
  getSelectedClientName(): string {
    if (!this.selectedClientId) return '';
    const client = this.clients.find(c => c.clientId === this.selectedClientId);
    return client ? client.name : '';
  }

  /**
   * Handles client selection from dropdown
   * @param clientId - The selected client ID
   * @param event - The click event
   */
  selectClient(clientId: number, event: Event): void {
    event.preventDefault();
    this.selectedClientId = clientId;
    this.validateClient();
  }

  /**
   * Toggles the client dropdown (placeholder for Bootstrap functionality)
   */
  toggleClientDropdown(): void {
    // Bootstrap will handle the dropdown toggle automatically
    // This method is here for potential future customization
  }
} 