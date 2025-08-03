import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav aria-label="Page navigation" *ngIf="totalPages > 1">
      <ul class="pagination pagination-sm justify-content-center mb-0">
        <!-- Previous button -->
        <li class="page-item" [class.disabled]="currentPage === 1">
          <button 
            class="page-link"
            [disabled]="currentPage === 1"
            (click)="onPageChange(currentPage - 1)"
            aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
          </button>
        </li>

        <!-- First page -->
        <li class="page-item" [class.active]="currentPage === 1" *ngIf="showFirstPage">
          <button class="page-link" (click)="onPageChange(1)">1</button>
        </li>

        <!-- Left ellipsis -->
        <li class="page-item disabled" *ngIf="showLeftEllipsis">
          <span class="page-link">...</span>
        </li>

        <!-- Page numbers -->
        <li 
          class="page-item" 
          [class.active]="page === currentPage"
          *ngFor="let page of visiblePages">
          <button class="page-link" (click)="onPageChange(page)">{{ page }}</button>
        </li>

        <!-- Right ellipsis -->
        <li class="page-item disabled" *ngIf="showRightEllipsis">
          <span class="page-link">...</span>
        </li>

        <!-- Last page -->
        <li class="page-item" [class.active]="currentPage === totalPages" *ngIf="showLastPage">
          <button class="page-link" (click)="onPageChange(totalPages)">{{ totalPages }}</button>
        </li>

        <!-- Next button -->
        <li class="page-item" [class.disabled]="currentPage === totalPages">
          <button 
            class="page-link"
            [disabled]="currentPage === totalPages"
            (click)="onPageChange(currentPage + 1)"
            aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- Page info -->
    <div class="d-flex justify-content-center align-items-center mt-2" *ngIf="totalPages > 1">
      <small class="text-muted">
        Showing {{ startItem }} to {{ endItem }} 
        <!-- of {{ totalItems }} entries -->
      </small>
    </div>
  `,
  styles: [`
    .page-link {
      color: #0d6efd;
      border-color: #dee2e6;
    }
    
    .page-link:hover {
      color: #0a58ca;
      background-color: #e9ecef;
      border-color: #dee2e6;
    }
    
    .page-item.active .page-link {
      background-color: #0d6efd;
      border-color: #0d6efd;
      color: #ffffff;
    }
    
    .page-item.disabled .page-link {
      color: #6c757d;
      background-color: #fff;
      border-color: #dee2e6;
    }
  `]
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() totalItems: number = 0;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to max visible
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate range around current page
      let start = Math.max(2, this.currentPage - 2);
      let end = Math.min(this.totalPages - 1, this.currentPage + 2);
      
      // Adjust if we're near the beginning or end
      if (this.currentPage <= 3) {
        start = 2;
        end = Math.min(this.totalPages - 1, 5);
      } else if (this.currentPage >= this.totalPages - 2) {
        start = Math.max(2, this.totalPages - 4);
        end = this.totalPages - 1;
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  get showFirstPage(): boolean {
    return this.totalPages > 1 && (this.visiblePages.length === 0 || this.visiblePages[0] > 1);
  }

  get showLastPage(): boolean {
    return this.totalPages > 1 && (this.visiblePages.length === 0 || this.visiblePages[this.visiblePages.length - 1] < this.totalPages);
  }

  get showLeftEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[0] > 2;
  }

  get showRightEllipsis(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
} 