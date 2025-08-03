import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError } from "rxjs";
import { Product, ProductRequest, ProductSearchRequest, ProductUpdateRequest, ProductUploadResponse, ProductUploadErrorResponse } from "../models/product.model";

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
     * Searches products based on search criteria with pagination
     * @param searchRequest - Search criteria
     * @param page - Page number (0-based)
     * @param size - Page size
     * @returns Observable of Product array
     */
    searchProducts(searchRequest: ProductSearchRequest, page: number = 0, size: number = 10): Observable<Product[]> {
        this.setLoading(true);
        this.clearError();
        
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        
        const url = `${this.apiUrl}/search?${params.toString()}`;
        
        return this.http.post<Product[]>(url, searchRequest).pipe(
            tap(products => {
                console.log('Products search completed:', products.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Gets all products without pagination (for lookups/dropdowns)
     * @returns Observable of all Product array
     */
    getAllProducts(): Observable<Product[]> {
        this.setLoading(true);
        this.clearError();
        
        const params = new URLSearchParams();
        params.append('page', '0');
        params.append('size', '1000'); // Large number to get all products
        
        const url = `${this.apiUrl}/search?${params.toString()}`;
        
        return this.http.post<Product[]>(url, {}).pipe(
            tap(products => {
                console.log('All products loaded successfully:', products.length);
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
     * @returns Observable of ProductUploadResponse
     */
    uploadProductsTsv(file: File): Observable<ProductUploadResponse> {
        this.setLoading(true);
        this.clearError();
        
        const formData = new FormData();
        formData.append('file', file);
        
        return this.http.post<ProductUploadResponse>(`${this.apiUrl}/upload`, formData).pipe(
            tap(response => {
                console.log('Products upload completed:', response);
                
                // Handle response based on status
                if (response.status === 'error' && response.tsvBase64 && response.filename) {
                    // Download the error TSV file
                    this.downloadTsvFromBase64(response.tsvBase64, response.filename);
                }
            }),
            catchError(this.handleUploadError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Downloads TSV content from base64 as a file
     * @param base64Content - Base64 encoded TSV content
     * @param filename - Name of the file to download
     */
    private downloadTsvFromBase64(base64Content: string, filename: string): void {
        try {
            console.log('Downloading TSV file with filename:', filename);
            
            // Decode base64 to binary string
            const binaryString = atob(base64Content);
            
            // Convert binary string to Uint8Array
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create blob and download
            const blob = new Blob([bytes], { type: 'text/tab-separated-values' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'products_upload_result.tsv'; // Fallback filename
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('TSV file download initiated successfully');
        } catch (error) {
            console.error('Error downloading TSV file:', error);
        }
    }

    /**
     * Downloads TSV content as a file (legacy method for backward compatibility)
     * @param content - TSV content to download
     * @param filename - Name of the file to download
     */
    private downloadTsvFile(content: string, filename: string): void {
        const blob = new Blob([content], { type: 'text/tab-separated-values' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Handles upload-specific errors
     * @param error - HTTP error response
     * @returns Observable that throws the error
     */
    private handleUploadError(error: HttpErrorResponse): Observable<never> {
        let errorMessage = 'An unexpected error occurred';
        
        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Client Error: ${error.error.message}`;
        } else {
            // Check if it's a structured error response
            if (error.error && typeof error.error === 'object' && error.error.message) {
                const errorResponse = error.error as ProductUploadErrorResponse;
                errorMessage = errorResponse.message;
            } else if (error.error && typeof error.error === 'string') {
                errorMessage = error.error;
            } else {
                // Fallback to generic server error
                errorMessage = `Server Error: ${error.status} - ${error.message}`;
                
                if (error.status === 404) {
                    errorMessage = 'Upload endpoint not found';
                } else if (error.status === 500) {
                    errorMessage = 'Internal server error during upload';
                } else if (error.status === 0) {
                    errorMessage = 'Unable to connect to server';
                }
            }
        }
        
        console.error('Upload API Error:', error);
        this.setError(errorMessage);
        
        return throwError(() => new Error(errorMessage));
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