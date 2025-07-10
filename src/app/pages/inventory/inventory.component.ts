import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { UploadInventoryModalComponent } from '../../components/upload-inventory-modal/upload-inventory-modal.component';
import { Product } from '../../models/product.model';
import { InventoryResponse, InventoryUpdateForm, InventorySearchRequest } from '../../models/inventory.model';
import { ProductService } from '../../services/product.service';
import { InventoryService } from '../../services/inventory.service';
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

  // Search configuration
  searchFields: SearchField[] = [
    {
      key: 'productName',
      label: 'Product Name',
      placeholder: 'Search by Product Name',
      type: 'text'
    }
  ];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private productService: ProductService,
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
   * Loads all products for name mapping
   */
  loadProducts() {
    this.productService.searchProducts({})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: Product[]) => {
          this.products = products;
        },
        error: (error: any) => {
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
   * Loads all inventory from the API
   */
  loadInventory() {
    const searchRequest: InventorySearchRequest = {};
    this.inventoryService.searchInventory(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory: InventoryResponse[]) => {
          this.inventory = inventory;
          this.toastService.showSuccess(`Loaded ${inventory.length} inventory records successfully`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to load inventory. Please try again.');
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
    } else if (isNaN(Number(quantity))) {
      this.editingErrors[inventoryId] = 'Quantity must be a valid number';
    } else if (Number(quantity) < 0) {
      this.editingErrors[inventoryId] = 'Quantity must be zero or positive';
    } else {
      this.editingErrors[inventoryId] = '';
    }
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
            this.toastService.showError('Failed to update inventory. Please try again.');
            console.error('Error updating inventory:', error);
          }
        });
    } else {
      this.cancelEdit(inventoryItem.id);
    }
  }

  /**
   * Handles inventory upload completion
   * @param uploadedInventory - The uploaded inventory data
   */
  onInventoryUploaded(uploadedInventory: InventoryResponse[]) {
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
    const searchRequest: InventorySearchRequest = {};
    
    // Map product name parameter for search
    if (criteria['productName']) {
      searchRequest.productName = criteria['productName'] as string;
    }
    
    this.inventoryService.searchInventory(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory: InventoryResponse[]) => {
          this.inventory = inventory;
          if (criteria['productName']) {
            this.toastService.showSuccess(`Found ${inventory.length} inventory records for product: ${criteria['productName']}`);
          }
        },
        error: (error: any) => {
          this.toastService.showError('Search failed. Please try again.');
          console.error('Search error:', error);
        }
      });
  }

  /**
   * Handles search clear
   */
  onClearSearch(): void {
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