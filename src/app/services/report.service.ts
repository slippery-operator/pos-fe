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
     * Handles HTTP errors and sets error state
     * @param error - HTTP error response
     * @returns Observable that throws the error
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Client Error: ${error.error.message}`;
        } else {
            // Server-side error
            errorMessage = `Server Error: ${error.status} - ${error.message}`;
            
            if (error.status === 404) {
                errorMessage = 'Report not found';
            } else if (error.status === 500) {
                errorMessage = 'Internal server error';
            } else if (error.status === 0) {
                errorMessage = 'Unable to connect to server';
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