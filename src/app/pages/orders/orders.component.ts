import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, forkJoin, of } from 'rxjs';
import { AddOrderModalComponent } from '../../components/add-order-modal/add-order-modal.component';
import { ViewOrderItemsModalComponent } from '../../components/view-order-items-modal/view-order-items-modal.component';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { PaginationComponent } from '../../components/shared/pagination/pagination.component';
import { OrderResponse, OrderItemForm, OrderItemWithProduct } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { RoleService } from '../../services/role.service';
import { ToastService } from '../../services/toast.service';

/**
 * Orders Component for managing orders
 * Handles CRUD operations with proper loading states and error handling
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AddOrderModalComponent,
    ViewOrderItemsModalComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    SearchPanelComponent,
    PaginationComponent
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: OrderResponse[] = [];
  showAddModal = false;
  showViewItemsModal = false;
  selectedOrderItems: OrderItemWithProduct[] = [];
  invoiceGenerated: { [key: number]: boolean } = {};
  generatingInvoice: { [key: number]: boolean } = {}; // Track invoice generation state

  // Button disabling state for error handling
  addButtonDisabled = false;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  currentSearchRequest: any = {};

  // Search configuration
  searchFields: SearchField[] = [
    {
      key: 'startDate',
      label: 'Start Date',
      type: 'date',
      max: new Date().toISOString().split('T')[0], // Cannot be later than today
      min: (() => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return oneMonthAgo.toISOString().split('T')[0];
      })(), // Cannot be earlier than 1 month ago
      value: new Date().toISOString().split('T')[0] // Default to today
    },
    {
      key: 'endDate',
      label: 'End Date',
      type: 'date',
      max: new Date().toISOString().split('T')[0], // Cannot be later than today
      value: new Date().toISOString().split('T')[0] // Default to today
    },
    {
      key: 'orderId',
      label: 'Order ID',
      placeholder: 'Search by Order ID',
      type: 'text'
    }
  ];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<SearchCriteria>(); // For debounced search

  constructor(
    private orderService: OrderService,
    public roleService: RoleService, // Made public for template access
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadOrders();
    this.updateDateConstraints();
    this.setupDebouncedSearch();
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
   * Sets up debounced search to improve performance
   */
  private setupDebouncedSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap((criteria: SearchCriteria) => {
        // Validate date range before searching
        if (!this.validateSearchDates(criteria)) {
          return of([]); // Return empty array if validation fails
        }

        this.currentSearchRequest = this.buildSearchRequest(criteria);
        this.currentPage = 1; // Reset to first page on new search
        return this.orderService.searchOrders(this.currentSearchRequest, 0, this.pageSize);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (orders: OrderResponse[]) => {
        this.orders = orders;
        this.checkInvoiceStatusForOrders(orders);
      },
      error: (error: any) => {
        console.error('Search error:', error);
      }
    });
  }

  /**
   * Validates search dates
   * @param criteria - Search criteria
   * @returns boolean indicating if dates are valid
   */
  private validateSearchDates(criteria: SearchCriteria): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Validate date range
    if (criteria['startDate'] && criteria['endDate']) {
      const startDate = new Date(criteria['startDate'] as string);
      const endDate = new Date(criteria['endDate'] as string);
      
      if (startDate > endDate) {
        this.toastService.showError('Start date cannot be later than end date');
        return false;
      }
      
      // Check if date range is more than 1 month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      if (startDate < oneMonthAgo) {
        this.toastService.showError('Date range cannot exceed 1 month. Please select a start date within the last month.');
        return false;
      }
    }
    
    // Validate that dates are not in the future
    if (criteria['startDate']) {
      const startDate = new Date(criteria['startDate'] as string);
      if (startDate > today) {
        this.toastService.showError('Start date cannot be later than today');
        return false;
      }
    }
    
    if (criteria['endDate']) {
      const endDate = new Date(criteria['endDate'] as string);
      if (endDate > today) {
        this.toastService.showError('End date cannot be later than today');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Builds search request from criteria
   * @param criteria - Search criteria
   * @returns formatted search request
   */
  private buildSearchRequest(criteria: SearchCriteria): any {
    const request: any = {};
    
    if (criteria['startDate']) {
      request.startDate = criteria['startDate'];
    }
    if (criteria['endDate']) {
      request.endDate = criteria['endDate'];
    }
    if (criteria['orderId']) {
      request.orderId = parseInt(criteria['orderId'] as string);
    }
    
    return request;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all orders from the API with pagination
   */
  loadOrders() {
    const page = this.currentPage - 1; // Convert to 0-based for API
    
    // Set default search criteria to today's date if no search request exists
    if (!this.currentSearchRequest || Object.keys(this.currentSearchRequest).length === 0) {
      this.currentSearchRequest = {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      };
    }
    
    this.orderService.searchOrders(this.currentSearchRequest, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders: OrderResponse[]) => {
          this.orders = orders;
          this.checkInvoiceStatusForOrders(orders);
          // Estimate total items for pagination
          if (orders.length < this.pageSize) {
            this.totalItems = (this.currentPage - 1) * this.pageSize + orders.length;
          } else {
            this.totalItems = this.currentPage * this.pageSize + 1;
          }
          this.toastService.showSuccess(`Loaded ${orders.length} orders successfully`);
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load orders. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading orders:', error);
        }
      });
  }

  /**
   * Checks invoice status for multiple orders efficiently
   * @param orders - Array of orders to check
   */
  private checkInvoiceStatusForOrders(orders: OrderResponse[]) {
    if (!orders || orders.length === 0) {
      return;
    }

    // Create batch requests for invoice status checking
    const invoiceChecks = orders.map(order => 
      this.orderService.checkInvoiceExists(order.id).pipe(
        takeUntil(this.destroy$)
      )
    );

    // Execute all checks in parallel
    forkJoin(invoiceChecks).subscribe({
      next: (results: boolean[]) => {
        orders.forEach((order, index) => {
          this.invoiceGenerated[order.id] = results[index];
        });
      },
      error: (error: any) => {
        console.error('Error checking invoice status:', error);
        // Set all to false on error to prevent UI issues
        orders.forEach(order => {
          this.invoiceGenerated[order.id] = false;
        });
      }
    });
  }

  /**
   * Calculates total price for an order
   * @param order - The order to calculate total for
   * @returns Total price
   */
  getTotalPrice(order: OrderResponse): number {
    return order.orderItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  }

  /**
   * Formats date for display
   * @param dateString - Date string to format
   * @returns Formatted date string
   */
  formatDate(dateString: string): string {
    console.log('Raw date string:', dateString); // Debug log
    
    let date: Date;
    
    // Handle different date formats
    if (typeof dateString === 'string') {
      // If it's a timestamp (number as string), convert it
      if (!isNaN(Number(dateString))) {
        const timestamp = Number(dateString);
        // Check if it's in seconds (10 digits) or milliseconds (13 digits)
        if (timestamp.toString().length === 10) {
          // Convert seconds to milliseconds
          date = new Date(timestamp * 1000);
        } else {
          // Assume milliseconds
          date = new Date(timestamp);
        }
      } else {
        // Try parsing as ISO string or other formats
        date = new Date(dateString);
      }
    } else if (typeof dateString === 'number') {
      const timestamp: number = dateString;
      // Check if it's in seconds (10 digits) or milliseconds (13 digits)
      if (timestamp.toString().length === 10) {
        // Convert seconds to milliseconds
        date = new Date(timestamp * 1000);
      } else {
        // Assume milliseconds
        date = new Date(timestamp);
      }
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    console.log('Parsed date:', date); // Debug log
    
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  }

  /**
   * Handles order creation from modal
   * @param orderItems - Array of order items
   */
  onOrderCreated(orderItems: OrderItemForm[]) {
    this.orderService.createOrder(orderItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newOrder: OrderResponse) => {
          this.orders.unshift(newOrder);
          this.toastService.showSuccess('Order created successfully');
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to create order. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          this.disableAddButtonTemporarily();
          console.error('Error creating order:', error);
        }
      });
  }

  /**
   * Handles viewing order items
   * @param order - The order to view items for
   */
  onViewItems(order: OrderResponse) {
    // Convert order items to include product information
    this.selectedOrderItems = order.orderItems.map(item => ({
      ...item,
      productName: '', // Will be populated by the modal component
      barcode: '' // Will be populated by the modal component
    }));
    this.showViewItemsModal = true;
  }

  /**
   * Handles invoice generation with improved feedback
   * @param order - The order to generate invoice for
   */
  onGenerateInvoice(order: OrderResponse) {
    // Prevent multiple simultaneous generation requests
    if (this.generatingInvoice[order.id]) {
      return;
    }

    this.generatingInvoice[order.id] = true;
    
    this.orderService.generateInvoice(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: string) => {
          // Update invoice status immediately after generation
          this.invoiceGenerated[order.id] = true;
          this.generatingInvoice[order.id] = false;
          
          // Show success message with the response from backend
          this.toastService.showSuccess(`Invoice generated successfully: ${response}`);
          console.log(`Invoice generated for order ${order.id}: ${response}`);
        },
        error: (error: any) => {
          this.generatingInvoice[order.id] = false;
          // Extract the exact error message from backend
          let errorMessage = 'Failed to generate invoice. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error generating invoice:', error);
        }
      });
  }

  /**
   * Handles invoice download
   * @param order - The order to download invoice for
   */
  onDownloadInvoice(order: OrderResponse) {
    this.orderService.downloadInvoice(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.toastService.showSuccess('Invoice downloaded successfully');
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to download invoice. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error downloading invoice:', error);
        }
      });
  }

  /**
   * Updates date constraints dynamically based on current date selections
   */
  private updateDateConstraints(): void {
    const today = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    
    // Update max date for both fields to today
    this.searchFields.forEach(field => {
      if (field.key === 'startDate') {
        field.max = today;
        field.min = oneMonthAgoStr; // Start date cannot be earlier than 1 month ago
      } else if (field.key === 'endDate') {
        field.max = today;
      }
    });
  }

  /**
   * Handles search with debouncing for better performance
   * @param criteria - Search criteria from the search panel
   */
  onSearch(criteria: SearchCriteria): void {
    // Use debounced search for better performance
    this.searchSubject.next(criteria);
  }

  /**
   * Handles search clear
   */
  onClearSearch(): void {
    this.currentSearchRequest = {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    };
    this.currentPage = 1;
    this.loadOrders();
  }

  /**
   * Handle page change events from pagination component
   * @param page - New page number
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  /**
   * Retries loading orders
   */
  retryLoadOrders(): void {
    this.orderService.clearErrorState();
    this.loadOrders();
  }

  /**
   * Gets loading state from service
   */
  get loading$() {
    return this.orderService.loading$;
  }

  /**
   * Gets error state from service
   */
  get error$() {
    return this.orderService.error$;
  }
} 