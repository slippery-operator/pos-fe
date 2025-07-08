import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AddOrderModalComponent } from '../../components/add-order-modal/add-order-modal.component';
import { ViewOrderItemsModalComponent } from '../../components/view-order-items-modal/view-order-items-modal.component';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { OrderResponse, OrderItemForm, OrderItemWithProduct } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
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
    SearchPanelComponent
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

  // Search configuration
  searchFields: SearchField[] = [
    {
      key: 'startDate',
      label: 'Start Date',
      placeholder: 'YYYY-MM-DD',
      type: 'date'
    },
    {
      key: 'endDate',
      label: 'End Date',
      placeholder: 'YYYY-MM-DD',
      type: 'date',
      max: new Date().toISOString().split('T')[0] // Limit to current date
    },
    {
      key: 'orderId',
      label: 'Order ID',
      placeholder: 'Search by order ID',
      type: 'number'
    }
  ];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all orders from the API
   */
  loadOrders() {
    const searchRequest = {};
    this.orderService.searchOrders(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders: OrderResponse[]) => {
          this.orders = orders;
          this.checkInvoiceStatusForOrders(orders);
          this.toastService.showSuccess(`Loaded ${orders.length} orders successfully`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to load orders. Please try again.');
          console.error('Error loading orders:', error);
        }
      });
  }

  /**
   * Checks invoice status for all orders
   * @param orders - Array of orders to check
   */
  private checkInvoiceStatusForOrders(orders: OrderResponse[]) {
    // Clear previous invoice status
    this.invoiceGenerated = {};
    
    // Check invoice status for each order
    orders.forEach(order => {
      this.orderService.checkInvoiceExists(order.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (exists: boolean) => {
            this.invoiceGenerated[order.id] = exists;
            console.log(`Invoice for order ${order.id}: ${exists ? 'exists' : 'does not exist'}`);
          },
          error: (error: any) => {
            console.error(`Error checking invoice for order ${order.id}:`, error);
            this.invoiceGenerated[order.id] = false;
          }
        });
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
      minute: '2-digit'
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
          this.toastService.showError('Failed to create order. Please try again.');
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
   * Handles invoice generation
   * @param order - The order to generate invoice for
   */
  onGenerateInvoice(order: OrderResponse) {
    this.orderService.generateInvoice(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: string) => {
          // Update invoice status immediately after generation
          this.invoiceGenerated[order.id] = true;
          this.toastService.showSuccess('Invoice generated successfully');
          console.log(`Invoice generated for order ${order.id}`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to generate invoice. Please try again.');
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
          this.toastService.showError('Failed to download invoice. Please try again.');
          console.error('Error downloading invoice:', error);
        }
      });
  }

  /**
   * Handles search functionality
   * @param criteria - Search criteria
   */
  onSearch(criteria: SearchCriteria): void {
    const searchRequest: any = {};
    
    if (criteria['startDate']) {
      searchRequest.startDate = criteria['startDate'];
    }
    if (criteria['endDate']) {
      searchRequest.endDate = criteria['endDate'];
    }
    if (criteria['orderId']) {
      searchRequest.orderId = parseInt(criteria['orderId'] as string);
    }

    this.orderService.searchOrders(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders: OrderResponse[]) => {
          this.orders = orders;
          this.checkInvoiceStatusForOrders(orders);
          this.toastService.showSuccess(`Found ${orders.length} orders`);
        },
        error: (error: any) => {
          this.toastService.showError('Failed to search orders. Please try again.');
          console.error('Error searching orders:', error);
        }
      });
  }

  /**
   * Handles search clear
   */
  onClearSearch(): void {
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