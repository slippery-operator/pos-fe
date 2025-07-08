import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AddProductModalComponent } from '../../components/add-product-modal/add-product-modal.component';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { Product, ProductRequest, ProductSearchRequest, ProductUpdateRequest } from '../../models/product.model';
import { Client } from '../../models/client.model';
import { ProductService } from '../../services/product.service';
import { ClientService } from '../../services/client.service';
import { ToastService } from '../../services/toast.service';

/**
 * Products Component for managing products
 * Handles CRUD operations with proper loading states and error handling
 */
@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AddProductModalComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    SearchPanelComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  clients: Client[] = [];
  showModal = false;
  editingProduct: { [key: number]: boolean } = {};
  editingName: { [key: number]: string } = {};
  editingMrp: { [key: number]: number | null } = {};
  editingErrors: { [key: number]: string } = {};

  // Search configuration
  searchFields: SearchField[] = [
    {
      key: 'barcode',
      label: 'Barcode',
      placeholder: 'Search by barcode',
      type: 'text'
    },
    {
      key: 'productName',
      label: 'Product Name',
      placeholder: 'Search by product name',
      type: 'text'
    }
  ];

  // Custom search fields for client dropdown
  selectedClientId: string = '';

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private clientService: ClientService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadClients();
    this.loadProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all clients for the search dropdown
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
   * Loads all products from the API
   */
  loadProducts() {
    const searchRequest: ProductSearchRequest = {};
    this.productService.searchProducts(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: Product[]) => {
          this.products = products;
          this.toastService.showSuccess(`Loaded ${products.length} products successfully`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to load products. Please try again.');
          console.error('Error loading products:', error);
        }
      });
  }

  /**
   * Gets client name by client ID
   * @param clientId - The client ID to get name for
   * @returns Client name or 'Unknown Client'
   */
  getClientName(clientId: number): string {
    const client = this.clients.find(c => c.clientId === clientId);
    return client ? client.name : 'Unknown Client';
  }

  /**
   * Starts editing mode for a product
   * @param product - The product to edit
   */
  startEdit(product: Product) {
    this.editingProduct[product.id] = true;
    this.editingName[product.id] = product.name;
    this.editingMrp[product.id] = product.mrp;
    this.editingErrors[product.id] = '';
  }

  /**
   * Cancels editing mode for a product
   * @param productId - The product ID to cancel editing for
   */
  cancelEdit(productId: number) {
    this.editingProduct[productId] = false;
    delete this.editingName[productId];
    delete this.editingMrp[productId];
    delete this.editingErrors[productId];
  }

  /**
   * Validates the editing data for a product
   * @param productId - The product ID being edited
   */
  validateEditingData(productId: number): void {
    const name = this.editingName[productId];
    const mrp = this.editingMrp[productId];
    const trimmedName = name ? name.trim() : '';
    
    if (trimmedName.length === 0) {
      this.editingErrors[productId] = 'Product name cannot be empty';
    } else if (trimmedName.length > 255) {
      this.editingErrors[productId] = 'Product name cannot exceed 255 characters';
    } else if (!mrp || mrp <= 0) {
      this.editingErrors[productId] = 'MRP must be a positive number';
    } else {
      this.editingErrors[productId] = '';
    }
  }

  /**
   * Checks if the current edit is valid
   * @param productId - The product ID being edited
   * @returns boolean indicating if the edit is valid
   */
  isValidEdit(productId: number): boolean {
    const name = this.editingName[productId];
    const mrp = this.editingMrp[productId];
    const trimmedName = name ? name.trim() : '';
    return trimmedName.length > 0 && trimmedName.length <= 255 && 
           (mrp !== null && mrp > 0) && !this.editingErrors[productId];
  }

  /**
   * Saves the edited product data
   * @param product - The product being edited
   */
  saveEdit(product: Product) {
    const newName = this.editingName[product.id];
    const newMrp = this.editingMrp[product.id];
    this.validateEditingData(product.id);
    
    if (!this.isValidEdit(product.id)) {
      return;
    }
    
    const trimmedName = newName.trim();
    if (trimmedName !== product.name || newMrp !== product.mrp) {
      const request: ProductUpdateRequest = {
        name: trimmedName,
        mrp: newMrp!,
        imageUrl: product.imageUrl
      };
      
      this.productService.updateProduct(product.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedProduct: Product) => {
            const index = this.products.findIndex(p => p.id === product.id);
            if (index !== -1) {
              this.products[index] = updatedProduct;
            }
            this.editingProduct[product.id] = false;
            delete this.editingName[product.id];
            delete this.editingMrp[product.id];
            delete this.editingErrors[product.id];
            this.toastService.showSuccess('Product updated successfully');
          },
          error: (error: any) => {
            this.toastService.showError('Failed to update product. Please try again.');
            console.error('Error updating product:', error);
          }
        });
    } else {
      this.cancelEdit(product.id);
    }
  }

  /**
   * Handles new product addition from modal
   * @param productRequest - The product data to add
   */
  onProductAdded(productRequest: ProductRequest) {
    this.productService.createProduct(productRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newProduct: Product) => {
          this.products.push(newProduct);
          this.showModal = false;
          this.toastService.showSuccess('Product added successfully');
        },
        error: (error: any) => {
          this.toastService.showError('Failed to add product. Please try again.');
          console.error('Error adding product:', error);
        }
      });
  }

  /**
   * Handles bulk product upload from modal
   * @param file - The TSV file to upload
   */
  onProductsUploaded(file: File) {
    this.productService.uploadProductsTsv(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newProducts: Product[]) => {
          this.products.push(...newProducts);
          this.showModal = false;
          this.toastService.showSuccess(`${newProducts.length} products uploaded successfully`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to upload products. Please try again.');
          console.error('Error uploading products:', error);
        }
      });
  }

  /**
   * Checks if a product is currently being edited
   * @param productId - The product ID to check
   * @returns boolean indicating if the product is being edited
   */
  isEditing(productId: number): boolean {
    return this.editingProduct[productId] || false;
  }

  /**
   * Retry loading products when an error occurs
   */
  retryLoadProducts(): void {
    this.productService.clearErrorState();
    this.loadProducts();
  }

  /**
   * Handles search criteria from the search panel
   * @param criteria - Search criteria containing the search parameters
   */
  onSearch(criteria: SearchCriteria): void {
    const searchRequest: ProductSearchRequest = {};
    
    if (criteria['barcode']) {
      searchRequest.barcode = criteria['barcode'] as string;
    }
    if (criteria['clientId']) {
      searchRequest.clientId = parseInt(criteria['clientId'] as string);
    }
    if (criteria['productName']) {
      searchRequest.productName = criteria['productName'] as string;
    }

    this.productService.searchProducts(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: Product[]) => {
          this.products = products;
          this.toastService.showSuccess(`Found ${products.length} product(s) matching your criteria`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to search products. Please try again.');
          console.error('Error searching products:', error);
        }
      });
  }

  /**
   * Handles clear search from the search panel
   * Reloads all products when search is cleared
   */
  onClearSearch(): void {
    this.loadProducts();
  }

  /**
   * Handles client filter change
   * Filters products by selected client
   */
  onClientFilterChange(): void {
    const searchRequest: ProductSearchRequest = {};
    
    if (this.selectedClientId) {
      searchRequest.clientId = parseInt(this.selectedClientId);
    }

    this.productService.searchProducts(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products: Product[]) => {
          this.products = products;
          if (this.selectedClientId) {
            const clientName = this.getClientName(parseInt(this.selectedClientId));
            this.toastService.showSuccess(`Found ${products.length} product(s) for client: ${clientName}`);
          } else {
            this.toastService.showSuccess(`Loaded ${products.length} products successfully`);
          }
        },
        error: (error: any) => {
          this.toastService.showError('Failed to filter products. Please try again.');
          console.error('Error filtering products:', error);
        }
      });
  }

  /**
   * Handles image error by hiding the image element
   * @param event - The error event
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }

  // Observable streams from service
  get loading$() {
    return this.productService.loading$;
  }
  
  get error$() {
    return this.productService.error$;
  }
} 