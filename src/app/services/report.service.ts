import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError } from "rxjs";
import { DaySalesResponse, ReportRequest } from "../models/report.model";

/**
 * Service for managing report data operations
 * Handles API calls with proper error handling and loading states
 */
@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private apiUrl = 'http://localhost:9000/reports';
    
    // Loading state management
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();
    
    // Error state management
    private errorSubject = new BehaviorSubject<string>('');
    public error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Gets day sales report for a date range
     * @param request - Report request with start and end dates
     * @returns Observable of DaySalesResponse array
     */
    getDaySalesReport(request: ReportRequest): Observable<DaySalesResponse[]> {
        this.setLoading(true);
        this.clearError();
        
        const params = new URLSearchParams();
        params.append('startDate', request.startDate);
        params.append('endDate', request.endDate);
        
        return this.http.get<DaySalesResponse[]>(`${this.apiUrl}/day-sales?${params.toString()}`).pipe(
            tap(report => {
                console.log('Day sales report generated:', report.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Downloads report data as CSV file
     * @param data - Report data to convert to CSV
     * @param startDate - Start date for filename
     * @param endDate - End date for filename
     */
    downloadReportAsCSV(data: DaySalesResponse[], startDate: string, endDate: string): void {
        try {
            // CSV headers
            const headers = ['Date', 'Invoiced Orders', 'Invoiced Items', 'Total Revenue (₹)'];
            
            // Convert data to CSV rows
            const csvRows = data.map(day => [
                this.formatDateForCSV(day.date),
                day.invoicedOrdersCount.toString(),
                day.invoicedItemsCount.toString(),
                day.totalRevenue.toFixed(2)
            ]);
            
            // Add headers to the beginning
            csvRows.unshift(headers);
            
            // Convert to CSV string
            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            
            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error generating CSV:', error);
            throw new Error('Failed to generate CSV file');
        }
    }

    /**
     * Formats date for CSV display
     * @param dateInput - Date input to format
     * @returns Formatted date string for CSV
     */
    private formatDateForCSV(dateInput: string | number): string {
        try {
            let date: Date;
            
            // Handle different date formats
            if (typeof dateInput === 'string') {
                if (!isNaN(Number(dateInput))) {
                    const timestamp = Number(dateInput);
                    date = new Date(timestamp * 1000);
                } else {
                    date = new Date(dateInput);
                }
            } else if (typeof dateInput === 'number') {
                date = new Date(dateInput * 1000);
            } else {
                date = new Date(dateInput);
            }
            
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            
            // Format as DD/MM/YYYY for CSV
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Kolkata'
            });
        } catch (error) {
            console.error('Error formatting date for CSV:', error);
            return 'Invalid Date';
        }
    }

    /**
     * Handles HTTP errors and sets error state
     * @param error - HTTP error response
     * @returns Observable that throws the error
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'An unexpected error occurred';
        
        // Don't handle 401 errors here - they're handled by the interceptor
        if (error.status === 401) {
            return throwError(() => error);
        }
        
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Client Error: ${error.error.message}`;
        } else {
            // Check if it's a structured error response from backend
            if (error.error && typeof error.error === 'object' && error.error.message) {
                // Extract the exact message from backend structured error
                errorMessage = error.error.message;
            } else if (error.error && typeof error.error === 'string') {
                // If error is a string, use it directly
                errorMessage = error.error;
            } else {
                // Fallback to generic server error
                errorMessage = `Server Error: ${error.status} - ${error.message}`;
                
                if (error.status === 404) {
                    errorMessage = 'Report not found';
                } else if (error.status === 500) {
                    errorMessage = 'Internal server error';
                } else if (error.status === 0) {
                    errorMessage = 'Unable to connect to server';
                }
            }
        }
        
        console.error('API Error:', error);
        this.setError(errorMessage);
        
        return throwError(() => new Error(errorMessage));
    }

    /**
     * Sets the loading state
     * @param loading - Whether the service is loading
     */
    private setLoading(loading: boolean): void {
        this.loadingSubject.next(loading);
    }

    /**
     * Sets the error message
     * @param error - Error message to display
     */
    private setError(error: string): void {
        this.errorSubject.next(error);
    }

    /**
     * Clears the current error state
     */
    private clearError(): void {
        this.errorSubject.next('');
    }

    /**
     * Manually clear error state (public method for components)
     */
    public clearErrorState(): void {
        this.clearError();
    }
} 