import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError } from "rxjs";
import { Product, ProductRequest, ProductSearchRequest, ProductUpdateRequest } from "../models/product.model";

/**
 * Service for managing product data operations
 * Handles CRUD operations with proper error handling and loading states
 */
@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private apiUrl = 'http://localhost:9000/products';
    
    // Loading state management
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();
    
    // Error state management
    private errorSubject = new BehaviorSubject<string>('');
    public error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Searches products based on search criteria
     * @param searchRequest - Search criteria
     * @returns Observable of Product array
     */
    searchProducts(searchRequest: ProductSearchRequest): Observable<Product[]> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.post<Product[]>(`${this.apiUrl}/search`, searchRequest).pipe(
            tap(products => {
                console.log('Products search completed:', products.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Creates a new product
     * @param product - Product data to create
     * @returns Observable of the created Product
     */
    createProduct(product: ProductRequest): Observable<Product> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.post<Product>(this.apiUrl, product).pipe(
            tap(newProduct => {
                console.log('Product created successfully:', newProduct);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Updates an existing product
     * @param id - Product ID to update
     * @param product - Updated product data
     * @returns Observable of the updated Product
     */
    updateProduct(id: number, product: ProductUpdateRequest): Observable<Product> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.put<Product>(`${this.apiUrl}/${id}`, product).pipe(
            tap(updatedProduct => {
                console.log('Product updated successfully:', updatedProduct);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Uploads products from TSV file
     * @param file - TSV file containing product data
     * @returns Observable of Product array
     */
    uploadProductsTsv(file: File): Observable<Product[]> {
        this.setLoading(true);
        this.clearError();
        
        const formData = new FormData();
        formData.append('file', file);
        
        return this.http.post<Product[]>(`${this.apiUrl}/upload`, formData).pipe(
            tap(products => {
                console.log('Products uploaded successfully:', products.length);
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