import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ClientService } from '../../services/client.service';
import { RoleService } from '../../services/role.service';
import { Product, ProductSearchRequest, ProductUpdateRequest } from '../../models/product.model';
import { Client } from '../../models/client.model';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField } from '../../components/shared/search-panel/search-panel.component';
import { PaginationComponent } from '../../components/shared/pagination/pagination.component';
import { AddProductModalComponent } from '../../components/add-product-modal/add-product-modal.component';
import { ToastService } from '../../services/toast.service';

/**
 * Products management component
 * Handles product listing, searching, and editing with role-based access control
 */
@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    SearchPanelComponent,
    PaginationComponent,
    AddProductModalComponent
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit, OnDestroy {
  // Data properties
  products: Product[] = [];
  allProducts: Product[] = []; // Store all products for client filtering
  clients: Client[] = [];
  
  // UI state
  showModal = false;
  selectedClientId: number | null = null;
  
  // Button disabling state for error handling
  addButtonDisabled = false;
  
  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  currentSearchRequest: ProductSearchRequest = { barcode: '', productName: '', clientId: undefined };
  
  // Search functionality - using compatible SearchField interface
  searchFields: SearchField[] = [
    { key: 'barcode', label: 'Barcode', type: 'text', placeholder: 'Search by Barcode' },
    { key: 'productName', label: 'Product Name', type: 'text', placeholder: 'Search by Product Name' }
  ];
  
  // Inline editing state
  editingProductId: number | null = null;
  editingName: { [key: number]: string } = {};
  editingMrp: { [key: number]: number } = {};
  editingNameErrors: { [key: number]: string } = {};
  editingMrpErrors: { [key: number]: string } = {};
  
  // Component cleanup
  private destroy$ = new Subject<void>();
  
  // Observable streams for template
  loading$: Observable<boolean>;
  error$: Observable<string>;

  constructor(
    private productService: ProductService,
    private clientService: ClientService,
    public roleService: RoleService, // Made public for template access
    private toastService: ToastService
  ) {
    // Initialize observables in constructor
    this.loading$ = this.productService.loading$;
    this.error$ = this.productService.error$;
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Disables the add button temporarily when errors occur
   * @param duration - Duration in milliseconds to disable the button (default: 5 seconds)
   */
  private disableAddButtonTemporarily(duration: number = 5000): void {
    this.addButtonDisabled = true;
    setTimeout(() => {
      this.addButtonDisabled = false;
    }, duration);
  }

  /**
   * Load initial data (products and clients)
   */
  private loadInitialData(): void {
    // Load clients first
    this.clientService.getAllClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.clients = clients;
        },
        error: (error) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load clients.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading clients:', error);
        }
      });

    // Load products
    this.loadProducts();
  }

  /**
   * Load products using empty search criteria with pagination
   */
  private loadProducts(): void {
    const page = this.currentPage - 1; // Convert to 0-based for API
    this.productService.searchProducts(this.currentSearchRequest, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products; // Store all products
          this.applyClientFilter(); // Apply client filter to the loaded products
          // Update total items based on filtered products
          this.updateTotalItems();
        },
        error: (error) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load products. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading products:', error);
        }
      });
  }

  /**
   * Handle search from search panel
   * @param searchData - Search criteria from search panel
   */
  onSearch(searchData: any): void {
    this.currentSearchRequest = {
      barcode: searchData.barcode || '',
      productName: searchData.productName || '',
      clientId: undefined // Don't send clientId to backend
    };
    this.currentPage = 1; // Reset to first page when searching
    this.loadProducts();
  }

  /**
   * Handle clear search
   */
  onClearSearch(): void {
    this.selectedClientId = null;
    this.currentSearchRequest = { barcode: '', productName: '', clientId: undefined };
    this.currentPage = 1;
    this.loadProducts();
  }

  /**
   * Handle client filter change
   */
  onClientFilterChange(): void {
    this.applyClientFilter();
  }

  /**
   * Apply client filter to the loaded products
   */
  private applyClientFilter(): void {
    if (this.selectedClientId === null) {
      // Show all products from current page
      this.products = [...this.allProducts];
    } else {
      // Filter products by selected client from current page
      this.products = this.allProducts.filter(product => product.clientId === this.selectedClientId);
    }
    // For client filtering, we need to load all products to get accurate count
    if (this.selectedClientId !== null) {
      this.loadAllProductsForClientFilter();
    } else {
      this.updateTotalItems();
    }
  }

  /**
   * Clear client filter
   */
  clearClientFilter(): void {
    this.selectedClientId = null;
    this.applyClientFilter();
  }

  /**
   * Load all products for client filtering (when client is selected)
   */
  private loadAllProductsForClientFilter(): void {
    this.productService.getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allProducts) => {
          // Filter all products by selected client
          this.products = allProducts.filter(product => product.clientId === this.selectedClientId);
          this.totalItems = this.products.length;
          this.currentPage = 1; // Reset to first page
        },
        error: (error) => {
          let errorMessage = 'Failed to load products for client filter.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading products for client filter:', error);
        }
      });
  }

  /**
   * Update total items for pagination based on filtered products
   */
  private updateTotalItems(): void {
    // For frontend filtering, we need to get the total count from backend
    // Since we're only loading one page at a time, we'll estimate based on current results
    if (this.products.length < this.pageSize) {
      this.totalItems = (this.currentPage - 1) * this.pageSize + this.products.length;
    } else {
      this.totalItems = this.currentPage * this.pageSize + 1;
    }
  }

  /**
   * Handle product added from modal
   * @param productRequest - New product request from modal
   */
  onProductAdded(productRequest: any): void {
    // Create the product via service
    this.productService.createProduct(productRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newProduct) => {
          // Add to all products
          this.allProducts.unshift(newProduct);
          
          // If client filter is applied, check if the new product matches
          if (this.selectedClientId !== null) {
            if (newProduct.clientId === this.selectedClientId) {
              this.products.unshift(newProduct);
              this.totalItems++;
            }
          } else {
            this.products.unshift(newProduct);
          }
          
          this.showModal = false;
          this.toastService.showSuccess('Product added successfully');
        },
        error: (error) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to add product. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          this.disableAddButtonTemporarily();
          console.error('Error creating product:', error);
        }
      });
  }

  /**
   * Handle products uploaded from modal
   */
  onProductsUploaded(): void {
    this.loadProducts(); // Reload all products to show uploaded ones
    this.showModal = false;
  }

  /**
   * Get client name by ID
   * @param clientId - Client ID
   * @returns Client name or 'Unknown'
   */
  getClientName(clientId: number): string {
    const client = this.clients.find(c => c.clientId === clientId);
    return client ? client.name : 'Unknown';
  }

  /**
   * Retry loading products
   */
  retryLoadProducts(): void {
    this.productService.clearErrorState();
    this.loadProducts();
  }

  /**
   * Handle page change events from pagination component
   * @param page - New page number
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    // If client filter is applied, we need to handle pagination differently
    if (this.selectedClientId !== null) {
      // For client filtering, we have all products loaded, so we need to implement frontend pagination
      this.applyFrontendPagination();
    } else {
      this.loadProducts();
    }
  }

  /**
   * Apply frontend pagination when client filter is active
   */
  private applyFrontendPagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Get all products for the selected client
    this.productService.getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allProducts) => {
          const filteredProducts = allProducts.filter(product => product.clientId === this.selectedClientId);
          this.totalItems = filteredProducts.length;
          this.products = filteredProducts.slice(startIndex, endIndex);
        },
        error: (error) => {
          let errorMessage = 'Failed to load products for pagination.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading products for pagination:', error);
        }
      });
  }

  // Inline editing methods
  /**
   * Check if product is being edited
   * @param productId - Product ID
   * @returns boolean
   */
  isEditing(productId: number): boolean {
    return this.editingProductId === productId;
  }

  /**
   * Start editing a product
   * @param product - Product to edit
   */
  startEdit(product: Product): void {
    this.editingProductId = product.id;
    this.editingName[product.id] = product.name;
    this.editingMrp[product.id] = product.mrp;
    this.editingNameErrors[product.id] = '';
    this.editingMrpErrors[product.id] = '';
  }

  /**
   * Cancel editing
   * @param productId - Product ID
   */
  cancelEdit(productId: number): void {
    this.editingProductId = null;
    delete this.editingName[productId];
    delete this.editingMrp[productId];
    delete this.editingNameErrors[productId];
    delete this.editingMrpErrors[productId];
  }

  /**
   * Save edited product
   * @param product - Product being edited
   */
  saveEdit(product: Product): void {
    if (!this.isValidEdit(product.id)) {
      return;
    }

    const updateRequest: ProductUpdateRequest = {
      name: this.editingName[product.id],
      mrp: this.editingMrp[product.id],
      imageUrl: product.imageUrl
    };

    this.productService.updateProduct(product.id, updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          // Update product in all products list
          const allProductsIndex = this.allProducts.findIndex(p => p.id === product.id);
          if (allProductsIndex !== -1) {
            this.allProducts[allProductsIndex] = updatedProduct;
          }
          
          // Update product in current products list if it exists
          const index = this.products.findIndex(p => p.id === product.id);
          if (index !== -1) {
            this.products[index] = updatedProduct;
          }
          
          this.cancelEdit(product.id);
          this.toastService.showSuccess('Product updated successfully');
        },
        error: (error) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to update product. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error updating product:', error);
        }
      });
  }

  /**
   * Validate editing data
   * @param productId - Product ID
   */
  validateEditingData(productId: number): void {
    const name = this.editingName[productId];
    const mrp = this.editingMrp[productId];

    // Validate name
    if (!name || name.trim().length === 0) {
      this.editingNameErrors[productId] = 'Name is required';
    } else if (name.trim().length > 50) {
      this.editingNameErrors[productId] = 'Name cannot exceed 50 characters';
    } else {
      this.editingNameErrors[productId] = '';
    }

    // Validate MRP
    if (!mrp || mrp <= 0 || !this.isValidNumber(mrp.toString())) {
      this.editingMrpErrors[productId] = 'MRP must be a positive number';
    } else if (mrp > 999999) {
      this.editingMrpErrors[productId] = 'MRP cannot exceed 999,999';
    } else {
      this.editingMrpErrors[productId] = '';
    }
  }

  /**
   * Check if edit is valid
   * @param productId - Product ID
   * @returns boolean
   */
  isValidEdit(productId: number): boolean {
    this.validateEditingData(productId);
    return !this.editingNameErrors[productId] && !this.editingMrpErrors[productId];
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
   * Handle image error
   * @param event - Error event
   */
  onImageError(event: any): void {
    event.target.src = '/assets/images/no-image.png';
  }
} 