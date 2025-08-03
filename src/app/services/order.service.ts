import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError, map, of } from "rxjs";
import { OrderResponse, OrderItemForm, OrderSearchRequest } from "../models/order.model";

/**
 * Service for managing order data operations
 * Handles CRUD operations with proper error handling and loading states
 */
@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private apiUrl = 'http://localhost:9000/orders';
    private invoiceApiUrl = 'http://localhost:9000/invoice';
    private productsApiUrl = 'http://localhost:9000/products';
    
    // Loading state management
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();
    
    // Error state management
    private errorSubject = new BehaviorSubject<string>('');
    public error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Searches orders based on search criteria with pagination
     * @param searchRequest - Search criteria
     * @param page - Page number (0-based)
     * @param size - Page size
     * @returns Observable of OrderResponse array
     */
    searchOrders(searchRequest: OrderSearchRequest, page: number = 0, size: number = 10): Observable<OrderResponse[]> {
        this.setLoading(true);
        this.clearError();
        
        let params = new URLSearchParams();
        if (searchRequest.startDate) {
            params.append('start-date', searchRequest.startDate);
        }
        if (searchRequest.endDate) {
            params.append('end-date', searchRequest.endDate);
        }
        if (searchRequest.orderId) {
            params.append('order-id', searchRequest.orderId.toString());
        }
        params.append('page', page.toString());
        params.append('size', size.toString());
        
        const url = `${this.apiUrl}?${params.toString()}`;
        
        return this.http.get<OrderResponse[]>(url).pipe(
            tap(orders => {
                console.log('Orders search completed:', orders.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Creates a new order
     * @param orderItems - List of order items
     * @returns Observable of the created OrderResponse
     */
    createOrder(orderItems: OrderItemForm[]): Observable<OrderResponse> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.post<OrderResponse>(this.apiUrl, orderItems).pipe(
            tap(newOrder => {
                console.log('Order created successfully:', newOrder);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Gets order details by ID
     * @param id - Order ID
     * @returns Observable of OrderResponse
     */
    getOrderById(id: number): Observable<OrderResponse> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.get<OrderResponse>(`${this.apiUrl}/${id}/order-items`).pipe(
            tap(order => {
                console.log('Order details retrieved:', order);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Validates barcode existence in the backend
     * @param barcode - Barcode to validate
     * @returns Observable of boolean indicating if barcode exists
     */
    validateBarcode(barcode: string): Observable<boolean> {
        this.clearError();
        
        const url = `${this.productsApiUrl}/check/${barcode}`;
        
        return this.http.get<boolean>(url).pipe(
            tap(isValid => {
                console.log('Barcode validation result:', isValid);
            }),
            catchError(this.handleError.bind(this))
        );
    }

    /**
     * Generates invoice for an order
     * @param orderId - Order ID
     * @returns Observable of invoice generation response
     */
    generateInvoice(orderId: number): Observable<string> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.get(`${this.invoiceApiUrl}/generate-invoice/${orderId}`, { 
            responseType: 'text' 
        }).pipe(
            tap(response => {
                console.log('Invoice generated successfully:', response);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Checks if invoice exists for an order
     * @param orderId - Order ID
     * @returns Observable of boolean indicating if invoice exists
     */
    checkInvoiceExists(orderId: number): Observable<boolean> {
        return this.http.get(`${this.invoiceApiUrl}/get-invoice/${orderId}`, { 
            responseType: 'blob',
            observe: 'response'
        }).pipe(
            map(response => {
                // If we get a successful response, invoice exists
                return response.status === 200;
            }),
            catchError((error: HttpErrorResponse) => {
                // If we get a 404, invoice doesn't exist
                if (error.status === 404) {
                    return of(false);
                }
                // For other errors, assume invoice doesn't exist
                console.error(`Error checking invoice for order ${orderId}:`, error);
                return of(false);
            })
        );
    }

    /**
     * Downloads invoice for an order
     * @param orderId - Order ID
     * @returns Observable of blob for file download
     */
    downloadInvoice(orderId: number): Observable<Blob> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.get(`${this.invoiceApiUrl}/get-invoice/${orderId}`, { 
            responseType: 'blob' 
        }).pipe(
            tap(blob => {
                console.log('Invoice downloaded successfully');
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `invoice_${orderId}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
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
                    errorMessage = 'Resource not found';
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