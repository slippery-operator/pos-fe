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
  showCSVDownload = false;
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
    // Set default dates (last 7 days, with end date as yesterday)
    const today = new Date();
    
    // Set end date to yesterday
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1);
    
    // Set start date to 6 days before the end date (7 days total)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 7 days total (including end date)
    
    this.reportForm.patchValue({
      startDate: this.formatDateForInput(startDate),
      endDate: this.formatDateForInput(endDate)
    });

    // Subscribe to individual field changes to update date constraints
    this.reportForm.get('startDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDateConstraints();
        this.resetDisplayStates();
      });

    this.reportForm.get('endDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDateConstraints();
        this.resetDisplayStates();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Resets display states when form values change
   */
  private resetDisplayStates(): void {
    this.showReport = false;
    this.showCSVDownload = false;
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
            
            // Check if date range is within 1 week
            const isWithinOneWeek = this.isDateRangeWithinOneWeek(formValue.startDate, formValue.endDate);
            
            if (isWithinOneWeek) {
              this.showReport = true;
              this.showCSVDownload = false;
              this.toastService.showSuccess(`Report generated successfully for ${data.length} day(s)`);
            } else {
              this.showReport = false;
              this.showCSVDownload = true;
              this.toastService.showSuccess(`Report data ready for download (${data.length} day(s))`);
            }
          },
          error: (error: any) => {
            // Extract the exact error message from backend
            let errorMessage = 'Failed to generate report. Please try again.';
            if (error && error.message) {
              errorMessage = error.message;
            }
            this.toastService.showError(errorMessage);
            console.error('Error generating report:', error);
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Checks if the date range is within 1 week (7 days or less)
   * @param startDate - Start date string
   * @param endDate - End date string
   * @returns True if date range is within 1 week
   */
  private isDateRangeWithinOneWeek(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate difference in days
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Return true if 7 days or less (including the start and end dates)
    return daysDiff <= 6; // 6 days difference means 7 days total
  }

  /**
   * Downloads the current report data as CSV
   */
  downloadCSV() {
    if (this.reportData.length > 0) {
      try {
        const formValue = this.reportForm.value;
        this.reportService.downloadReportAsCSV(
          this.reportData, 
          formValue.startDate, 
          formValue.endDate
        );
        this.toastService.showSuccess('CSV file downloaded successfully');
      } catch (error) {
        this.toastService.showError('Failed to download CSV file');
        console.error('Error downloading CSV:', error);
      }
    } else {
      this.toastService.showError('No data available for download');
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
   * @param dateInput - Date input to format (Unix timestamp from backend)
   * @returns Formatted date string
   */
  formatDate(dateInput: string | number): string {
    try {
      let date: Date;
      
      // Handle different date formats
      if (typeof dateInput === 'string') {
        // If it's a timestamp (number as string), convert it
        if (!isNaN(Number(dateInput))) {
          const timestamp = Number(dateInput);
          // Backend sends Unix timestamp in seconds, convert to milliseconds
          date = new Date(timestamp * 1000);
        } else {
          // Try parsing as ISO string or other formats
          date = new Date(dateInput);
        }
      } else if (typeof dateInput === 'number') {
        // Backend sends Unix timestamp in seconds, convert to milliseconds
        date = new Date(dateInput * 1000);
      } else {
        date = new Date(dateInput);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateInput);
        return 'Invalid Date';
      }
      
      // Convert UTC to IST (UTC+5:30) and format
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  // Observable streams from service
  get loading$() {
    return this.reportService.loading$;
  }
  
  get error$() {
    return this.reportService.error$;
  }

  /**
   * Updates date constraints dynamically based on current form values
   */
  private updateDateConstraints(): void {
    const startDateValue = this.reportForm.get('startDate')?.value;
    const endDateValue = this.reportForm.get('endDate')?.value;
    
    // Update min/max attributes dynamically
    if (startDateValue) {
      this.minEndDate = startDateValue;
    } else {
      this.minEndDate = ''; // No minimum if no start date
    }
    if (endDateValue) {
      this.maxStartDate = endDateValue;
    } else {
      this.maxStartDate = this.getYesterdayDate(); // Default to yesterday
    }
  }

  // Properties for dynamic date constraints
  minEndDate: string = '';
  maxStartDate: string = '';

  /**
   * Gets the minimum date for end date field
   * @returns Minimum date string (start date) or empty string if no start date
   */
  getMinEndDate(): string {
    return this.minEndDate;
  }

  /**
   * Gets the maximum date for start date field
   * @returns Maximum date string (end date or yesterday)
   */
  getMaxStartDate(): string {
    return this.maxStartDate;
  }

  /**
   * Gets the date range information for display
   * @returns Object with start and end dates formatted for display
   */
  getDateRangeInfo(): { startDate: string; endDate: string; daysCount: number } {
    const formValue = this.reportForm.value;
    if (formValue.startDate && formValue.endDate) {
      const start = new Date(formValue.startDate);
      const end = new Date(formValue.endDate);
      const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
      
      return {
        startDate: this.formatDateForDisplay(start),
        endDate: this.formatDateForDisplay(end),
        daysCount: daysCount
      };
    }
    return { startDate: '', endDate: '', daysCount: 0 };
  }

  /**
   * Formats date for display purposes
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  }
} 