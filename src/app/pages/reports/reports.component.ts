import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { DaySalesResponse, ReportRequest } from '../../models/report.model';
import { ReportService } from '../../services/report.service';
import { ToastService } from '../../services/toast.service';

/**
 * Reports Component for generating and displaying sales reports
 * Handles date range selection and report generation with proper loading states
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    ErrorDisplayComponent
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, OnDestroy {
  reportForm: FormGroup;
  reportData: DaySalesResponse[] = [];
  showReport = false;
  aggregatedData = {
    totalInvoicedOrders: 0,
    totalInvoicedItems: 0,
    totalRevenue: 0
  };

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private reportService: ReportService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.reportForm = this.fb.group({
      startDate: ['', [Validators.required, this.maxDateValidator.bind(this)]],
      endDate: ['', [Validators.required, this.maxDateValidator.bind(this)]]
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit() {
    // Set default dates (last 30 days, with end date as yesterday)
    const today = new Date();
    
    // Set end date to yesterday
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1);
    
    // Set start date to 30 days before the end date
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29); // 30 days total (including end date)
    
    this.reportForm.patchValue({
      startDate: this.formatDateForInput(startDate),
      endDate: this.formatDateForInput(endDate)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Custom validator for maximum date (yesterday)
   * Ensures end date is not later than yesterday
   */
  maxDateValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const selectedDate = new Date(control.value);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999); // End of yesterday
    
    if (selectedDate > yesterday) {
      return { maxDateExceeded: true };
    }
    
    return null;
  }

  /**
   * Custom validator for date range
   * Ensures end date is not before start date
   */
  dateRangeValidator(group: FormGroup) {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return { dateRangeInvalid: true };
      }
    }
    
    return null;
  }

  /**
   * Formats date for HTML date input
   * @param date - Date to format
   * @returns Formatted date string (YYYY-MM-DD)
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Gets yesterday's date formatted for HTML date input
   * @returns Yesterday's date as YYYY-MM-DD string
   */
  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.formatDateForInput(yesterday);
  }

  /**
   * Generates the report based on form data
   */
  generateReport() {
    if (this.reportForm.valid) {
      const formValue = this.reportForm.value;
      const request: ReportRequest = {
        startDate: formValue.startDate,
        endDate: formValue.endDate
      };

      this.reportService.getDaySalesReport(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: DaySalesResponse[]) => {
            this.reportData = data;
            this.calculateAggregatedData();
            this.showReport = true;
            this.toastService.showSuccess(`Report generated successfully for ${data.length} day(s)`);
          },
          error: (error: any) => {
            this.toastService.showError('Failed to generate report. Please try again.');
            console.error('Error generating report:', error);
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Calculates aggregated data from the report
   */
  private calculateAggregatedData() {
    this.aggregatedData = this.reportData.reduce((acc, day) => {
      acc.totalInvoicedOrders += day.invoicedOrdersCount || 0;
      acc.totalInvoicedItems += day.invoicedItemsCount || 0;
      acc.totalRevenue += day.totalRevenue || 0;
      return acc;
    }, {
      totalInvoicedOrders: 0,
      totalInvoicedItems: 0,
      totalRevenue: 0
    });
  }

  /**
   * Marks all form controls as touched to trigger validation display
   */
  private markFormGroupTouched() {
    Object.keys(this.reportForm.controls).forEach(key => {
      const control = this.reportForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Retry loading report when an error occurs
   */
  retryLoadReport(): void {
    this.reportService.clearErrorState();
    this.generateReport();
  }

  /**
   * Formats currency for display (without rupee symbol)
   * @param amount - Amount to format
   * @returns Formatted number string with comma formatting
   */
  formatNumber(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formats currency for display
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Formats date for display
   * @param dateString - Date string to format
   * @returns Formatted date string
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Observable streams from service
  get loading$() {
    return this.reportService.loading$;
  }
  
  get error$() {
    return this.reportService.error$;
  }
} 