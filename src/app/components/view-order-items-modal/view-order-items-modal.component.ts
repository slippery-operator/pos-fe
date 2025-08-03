import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { OrderItemWithProduct } from '../../models/order.model';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

/**
 * Modal component for viewing order items
 * Displays items in a horizontal scrollable card carousel
 */
@Component({
  selector: 'view-order-items-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-order-items-modal.component.html',
  styleUrls: ['./view-order-items-modal.component.css']
})
export class ViewOrderItemsModalComponent implements OnInit, OnDestroy {
  @Input() show = false;
  @Input() orderItems: OrderItemWithProduct[] = [];
  @Output() showChange = new EventEmitter<boolean>();

  // Products for mapping product names
  products: Product[] = [];
  
  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.loadProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all products for mapping product names
   */
  loadProducts() {
    this.productService.getAllProducts()
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
   * Gets product barcode by product ID
   * @param productId - The product ID to get barcode for
   * @returns Product barcode or 'Unknown'
   */
  getProductBarcode(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.barcode : 'Unknown';
  }

  /**
   * Calculates total price for an order item
   * @param item - The order item
   * @returns Total price
   */
  getTotalPrice(item: OrderItemWithProduct): number {
    return item.quantity * item.sellingPrice;
  }

  /**
   * Calculates total quantity of all order items
   * @returns Total quantity
   */
  getTotalQuantity(): number {
    return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Calculates grand total of all order items
   * @returns Grand total
   */
  getGrandTotal(): number {
    return this.orderItems.reduce((sum, item) => sum + this.getTotalPrice(item), 0);
  }

  /**
   * Closes the modal
   */
  closeModal() {
    this.showChange.emit(false);
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
} 