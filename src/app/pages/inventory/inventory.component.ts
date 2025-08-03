import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { PaginationComponent } from '../../components/shared/pagination/pagination.component';
import { UploadInventoryModalComponent } from '../../components/upload-inventory-modal/upload-inventory-modal.component';
import { Product } from '../../models/product.model';
import { InventoryResponse, InventoryUpdateForm, InventorySearchRequest } from '../../models/inventory.model';
import { ProductService } from '../../services/product.service';
import { InventoryService } from '../../services/inventory.service';
import { RoleService } from '../../services/role.service';
import { ToastService } from '../../services/toast.service';

/**
 * Inventory Component for managing inventory
 * Handles inventory operations with product name mapping and quantity management
 */
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    SearchPanelComponent,
    PaginationComponent,
    UploadInventoryModalComponent
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit, OnDestroy {
  inventory: InventoryResponse[] = [];
  products: Product[] = [];
  showUploadModal = false;
  editingQuantity: { [key: number]: string | null } = {};
  editingErrors: { [key: number]: string } = {};

  // Button disabling state for error handling
  uploadButtonDisabled = false;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  currentSearchRequest: InventorySearchRequest = { productName: '', barcode: '' };

  // Search configuration
  searchFields: SearchField[] = [
    {
      key: 'productName',
      label: 'Product Name',
      placeholder: 'Search by Product Name',
      type: 'text'
    },
    {
      key: 'barcode',
      label: 'Barcode',
      placeholder: 'Search by Barcode',
      type: 'text'
    }
  ];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
    public roleService: RoleService, // Made public for template access
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadInventory();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Disables the upload button temporarily when errors occur
   * @param duration - Duration in milliseconds to disable the button (default: 5 seconds)
   */
  private disableUploadButtonTemporarily(duration: number = 5000): void {
    this.uploadButtonDisabled = true;
    setTimeout(() => {
      this.uploadButtonDisabled = false;
    }, duration);
  }

  /**
   * Loads all products for name mapping
   */
  loadProducts() {
    this.productService.getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: Product[]) => {
          this.products = products;
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load products.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading products:', error);
        }
      });
  }

  /**
   * Gets product name by product ID
   * @param productId - The product ID to get name for
   * @returns Product name or 'Unknown Product'
   */
  getProductName(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  }

  /**
   * Gets product barcode by product ID
   * @param productId - The product ID to get barcode for
   * @returns Product barcode or 'Unknown Barcode'
   */
  getProductBarcode(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.barcode : 'Unknown Barcode';
  }

  /**
   * Loads all inventory from the API with pagination
   */
  loadInventory() {
    const page = this.currentPage - 1; // Convert to 0-based for API
    this.inventoryService.searchInventory(this.currentSearchRequest, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory: InventoryResponse[]) => {
          this.inventory = inventory;
          // Estimate total items for pagination
          if (inventory.length < this.pageSize) {
            this.totalItems = (this.currentPage - 1) * this.pageSize + inventory.length;
          } else {
            this.totalItems = this.currentPage * this.pageSize + 1;
          }
          this.toastService.showSuccess(`Loaded ${inventory.length} inventory records successfully`);
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load inventory. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading inventory:', error);
        }
      });
  }

  /**
   * Starts editing mode for inventory quantity
   * @param inventoryItem - The inventory item to edit
   */
  startEdit(inventoryItem: InventoryResponse) {
    this.editingQuantity[inventoryItem.id] = inventoryItem.quantity.toString();
    this.editingErrors[inventoryItem.id] = '';
  }

  /**
   * Cancels editing mode for inventory
   * @param inventoryId - The inventory ID to cancel editing for
   */
  cancelEdit(inventoryId: number) {
    delete this.editingQuantity[inventoryId];
    delete this.editingErrors[inventoryId];
  }

  /**
   * Validates the editing data for inventory
   * @param inventoryId - The inventory ID being edited
   */
  validateEditingData(inventoryId: number): void {
    const quantity = this.editingQuantity[inventoryId];
    
    if (quantity === undefined || quantity === null || quantity === '') {
      this.editingErrors[inventoryId] = 'Quantity cannot be empty';
    } else if (isNaN(Number(quantity)) || !this.isValidNumber(quantity)) {
      this.editingErrors[inventoryId] = 'Quantity must be a valid number';
    } else if (!Number.isInteger(Number(quantity))) {
      this.editingErrors[inventoryId] = 'Quantity must be a whole number';
    } else if (Number(quantity) < 0) {
      this.editingErrors[inventoryId] = 'Quantity must be zero or positive';
    } else if (Number(quantity) > 999999) {
      this.editingErrors[inventoryId] = 'Quantity cannot exceed 999,999';
    } else {
      this.editingErrors[inventoryId] = '';
    }
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
   * Checks if the current edit is valid
   * @param inventoryId - The inventory ID being edited
   * @returns boolean indicating if the edit is valid
   */
  isValidEdit(inventoryId: number): boolean {
    const quantity = this.editingQuantity[inventoryId];
    return quantity !== undefined && 
           quantity !== null && 
           quantity !== '' && 
           !isNaN(Number(quantity)) && 
           Number(quantity) >= 0 && 
           !this.editingErrors[inventoryId];
  }

  /**
   * Saves the edited inventory data
   * @param inventoryItem - The inventory item being edited
   */
  saveEdit(inventoryItem: InventoryResponse) {
    const newQuantity = this.editingQuantity[inventoryItem.id];
    this.validateEditingData(inventoryItem.id);
    
    if (!this.isValidEdit(inventoryItem.id)) {
      return;
    }
    
    const numericQuantity = Number(newQuantity);
    if (numericQuantity !== inventoryItem.quantity) {
      const request: InventoryUpdateForm = {
        quantity: numericQuantity
      };
      
      this.inventoryService.updateInventoryByProductId(inventoryItem.productId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedInventory) => {
            // Update the local inventory array
            const index = this.inventory.findIndex(item => item.id === inventoryItem.id);
            if (index !== -1) {
              this.inventory[index] = updatedInventory;
            }
            
            this.toastService.showSuccess('Inventory updated successfully');
            this.cancelEdit(inventoryItem.id);
          },
          error: (error: any) => {
            // Extract the exact error message from backend
            let errorMessage = 'Failed to update inventory. Please try again.';
            if (error && error.message) {
              errorMessage = error.message;
            }
            this.toastService.showError(errorMessage);
            console.error('Error updating inventory:', error);
          }
        });
    } else {
      this.cancelEdit(inventoryItem.id);
    }
  }

  /**
   * Handles inventory upload completion
   */
  onInventoryUploaded() {
    this.loadInventory(); // Reload inventory to show updated data
  }

  /**
   * Checks if inventory item is being edited
   * @param inventoryId - The inventory ID to check
   * @returns boolean indicating if the item is being edited
   */
  isEditing(inventoryId: number): boolean {
    return inventoryId in this.editingQuantity;
  }

  /**
   * Retries loading inventory
   */
  retryLoadInventory(): void {
    this.inventoryService.clearErrorState();
    this.loadInventory();
  }

  /**
   * Handles search criteria
   * @param criteria - Search criteria from search panel
   */
  onSearch(criteria: SearchCriteria): void {
    this.currentSearchRequest = {};
    
    // Map product name parameter for search
    if (criteria['productName']) {
      this.currentSearchRequest.productName = criteria['productName'] as string;
    }
    
    // Map barcode parameter for search
    if (criteria['barcode']) {
      this.currentSearchRequest.barcode = criteria['barcode'] as string;
    }
    
    this.currentPage = 1; // Reset to first page when searching
    this.loadInventory();
  }

  /**
   * Handles search clear
   */
  onClearSearch(): void {
    this.currentSearchRequest = { productName: '', barcode: '' };
    this.currentPage = 1;
    this.loadInventory();
  }

  /**
   * Handle page change events from pagination component
   * @param page - New page number
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadInventory();
  }

  /**
   * Gets loading state from service
   */
  get loading$() {
    return this.inventoryService.loading$;
  }

  /**
   * Gets error state from service
   */
  get error$() {
    return this.inventoryService.error$;
  }
} 