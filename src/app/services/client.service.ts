import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap, throwError } from "rxjs";
import { Client, ClientRequest } from "../models/client.model";

/**
 * Service for managing client data operations
 * Handles CRUD operations with proper error handling and loading states
 */
@Injectable({
    providedIn: 'root'
})
export class ClientService {
    private apiUrl = 'http://localhost:9000/clients';
    
    // Create file base urls ki... Can keep this URL part here

    // Loading state management
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$ = this.loadingSubject.asObservable();
    
    // Error state management
    private errorSubject = new BehaviorSubject<string>('');
    public error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) {}

    /**
     * Retrieves all clients from the API
     * @returns Observable of Client array
     */
    getClients(): Observable<Client[]> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.get<Client[]>(this.apiUrl).pipe(
            tap(clients => {
                console.log('Clients loaded successfully:', clients.length);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Adds a new client to the system
     * @param client - Client data to add
     * @returns Observable of the created Client
     */
    addClient(client: ClientRequest): Observable<Client> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.post<Client>(this.apiUrl, client).pipe(
            tap(newClient => {
                console.log('Client added successfully:', newClient);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }

    /**
     * Updates an existing client
     * @param id - Client ID to update
     * @param client - Updated client data
     * @returns Observable of the updated Client
     */
    updateClient(id: number, client: ClientRequest): Observable<Client> {
        this.setLoading(true);
        this.clearError();
        
        return this.http.put<Client>(`${this.apiUrl}/${id}`, client).pipe(
            tap(updatedClient => {
                console.log('Client updated successfully:', updatedClient);
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

    /**
     * Searches clients by name using the search endpoint
     * @param name - Name to search for
     * @returns Observable of Client array matching the search criteria
     */
    searchClientsByName(name: string): Observable<Client[]> {
        this.setLoading(true);
        this.clearError();
        
        const searchUrl = `${this.apiUrl}/search?name=${encodeURIComponent(name)}`;
        
        return this.http.get<Client[]>(searchUrl).pipe(
            tap(clients => {
                console.log('Clients search completed:', clients.length, 'results for:', name);
            }),
            catchError(this.handleError.bind(this)),
            finalize(() => this.setLoading(false))
        );
    }
}