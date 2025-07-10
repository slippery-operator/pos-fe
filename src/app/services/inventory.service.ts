import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError } from "rxjs";
import { InventoryResponse, InventoryUpdateForm, InventorySearchRequest } from "../models/inventory.model";

/**
 * Service for managing inventory data operations
 * Handles CRUD operations with proper error handling and loading states
 */
@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private apiUrl = 'http://localhost:9000/inventory';
    
    // Loading state management
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();
    
    // Error state management
    private errorSubject = new BehaviorSubject<string>('');
    public error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Searches inventory based on search criteria
     * @param searchRequest - Search criteria
     * @returns Observable of InventoryResponse array
     */
    searchInventory(searchRequest: InventorySearchRequest): Observable<InventoryResponse[]> {
        this.setLoading(true);
        this.clearError();
        
        const params = new URLSearchParams();
        if (searchRequest.productName) {
            params.append('productName', searchRequest.productName);
        }
        
        const url = params.toString() ? `${this.apiUrl}?${params.toString()}` : this.apiUrl;
        
        return this.http.get<InventoryResponse[]>(url).pipe(
            tap(inventory => {
                console.log('Inventory search completed:', inventory.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Updates inventory by product ID
     * @param productId - Product ID to update inventory for
     * @param inventoryUpdateForm - Updated inventory data
     * @returns Observable of the updated InventoryResponse
     */
    updateInventoryByProductId(productId: number, inventoryUpdateForm: InventoryUpdateForm): Observable<InventoryResponse> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.put<InventoryResponse>(`${this.apiUrl}/${productId}`, inventoryUpdateForm).pipe(
            tap(updatedInventory => {
                console.log('Inventory updated successfully:', updatedInventory);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Uploads inventory from TSV file
     * @param file - TSV file containing inventory data
     * @returns Observable of InventoryResponse array
     */
    uploadInventoryTsv(file: File): Observable<InventoryResponse[]> {
        this.setLoading(true);
        this.clearError();
        
        const formData = new FormData();
        formData.append('file', file);
        
        return this.http.post<InventoryResponse[]>(`${this.apiUrl}/upload`, formData).pipe(
            tap(inventory => {
                console.log('Inventory uploaded successfully:', inventory.length);
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
                errorMessage = 'Resource not found';
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