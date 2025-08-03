import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AddClientModalComponent } from '../../components/add-client-modal/add-client-modal.component';
import { LoadingSpinnerComponent } from '../../components/shared/loading-spinner/loading-spinner.component';
import { ErrorDisplayComponent } from '../../components/shared/error-display/error-display.component';
import { SearchPanelComponent, SearchField, SearchCriteria } from '../../components/shared/search-panel/search-panel.component';
import { PaginationComponent } from '../../components/shared/pagination/pagination.component';
import { Client, ClientRequest } from '../../models/client.model';
import { ClientService } from '../../services/client.service';
import { RoleService } from '../../services/role.service';
import { ToastService } from '../../services/toast.service';

/**
 * CMS Component for managing clients
 * Handles CRUD operations with proper loading states and error handling
 */
@Component({
  selector: 'app-cms',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AddClientModalComponent,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    SearchPanelComponent,
    PaginationComponent
  ],
  templateUrl: './cms.component.html',
  styleUrl: './cms.component.css'
})
export class CmsComponent {
  clients: Client[] = [];
  showModal = false;
  editingClient: { [key: number]: boolean } = {};
  editingName: { [key: number]: string } = {};
  editingErrors: { [key: number]: string } = {};

  // Button disabling state for error handling
  addButtonDisabled = false;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  currentSearchTerm = '';

  // Search configuration for client name search
  searchFields: SearchField[] = [
    {
      key: 'name',
      label: 'Name',
      placeholder: 'Search by Client Name',
      type: 'text'
    }
  ];

  // Component destruction subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private clientService: ClientService,
    public roleService: RoleService, // Made public for template access
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadClients();
  }

  /**
   * Disables the add button temporarily when errors occur
   * @param duration - Duration in milliseconds to disable the button (default: 5 seconds)
   */
  private disableAddButtonTemporarily(duration: number = 5000): void {
    this.addButtonDisabled = true;
    setTimeout(() => {
      this.addButtonDisabled = false;
    }, duration);
  }

  /**
   * Loads all clients from the API with pagination
   */
  loadClients() {
    const page = this.currentPage - 1; // Convert to 0-based for API
    this.clientService.getClients(page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients: Client[]) => {
          this.clients = clients;
          // Note: Backend doesn't return total count, so we estimate based on page size
          // If we get less than pageSize, we're on the last page
          if (clients.length < this.pageSize) {
            this.totalItems = (this.currentPage - 1) * this.pageSize + clients.length;
          } else {
            // Estimate total items (this is a limitation without total count from backend)
            this.totalItems = this.currentPage * this.pageSize + 1;
          }
          this.toastService.showSuccess(`Loaded ${clients.length} clients successfully`);
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to load clients. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error loading clients:', error);
        }
      });
  }

  /**
   * Starts editing mode for a client
   * @param client - The client to edit
   */
  // TODO: use spy operator to check if the function is called
  startEdit(client: Client) {
    this.editingClient[client.clientId] = true;
    this.editingName[client.clientId] = client.name;
    this.editingErrors[client.clientId] = '';
  }

  /**
   * Cancels editing mode for a client
   * @param clientId - The client ID to cancel editing for
   */
  cancelEdit(clientId: number) {
    this.editingClient[clientId] = false;
    delete this.editingName[clientId];
    delete this.editingErrors[clientId];
  }

  /**
   * Validates the editing name for a client
   * @param clientId - The client ID being edited
   */
  validateEditingName(clientId: number): void {
    const name = this.editingName[clientId];
    const trimmedName = name ? name.trim() : '';
    
    if (trimmedName.length === 0) {
      this.editingErrors[clientId] = 'Client name cannot be empty';
    } else if (trimmedName.length > 50) {
      this.editingErrors[clientId] = 'Client name cannot exceed 50 characters';
    } else {
      this.editingErrors[clientId] = '';
    }
  }

  /**
   * Checks if the current edit is valid
   * @param clientId - The client ID being edited
   * @returns boolean indicating if the edit is valid
   */
  isValidEdit(clientId: number): boolean {
    const name = this.editingName[clientId];
    const trimmedName = name ? name.trim() : '';
    return trimmedName.length > 0 && trimmedName.length <= 50 && !this.editingErrors[clientId];
  }
// TODO: use safe check opertor
  /**
   * Saves the edited client data
   * @param client - The client being edited
   */
  saveEdit(client: Client) {
    const newName = this.editingName[client.clientId];
    this.validateEditingName(client.clientId);
    
    if (!this.isValidEdit(client.clientId)) {
      return;
    }
    
    const trimmedName = newName.trim();
    if (trimmedName !== client.name) {
      const request: ClientRequest = { name: trimmedName };
      
      this.clientService.updateClient(client.clientId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedClient: Client) => {
            const index = this.clients.findIndex(c => c.clientId === client.clientId);
            if (index !== -1) {
              this.clients[index] = updatedClient;
            }
            this.editingClient[client.clientId] = false;
            delete this.editingName[client.clientId];
            delete this.editingErrors[client.clientId];
            this.toastService.showSuccess('Client updated successfully');
          },
          error: (error: any) => {
            // Extract the exact error message from backend
            let errorMessage = 'Failed to update client. Please try again.';
            if (error && error.message) {
              errorMessage = error.message;
            }
            this.toastService.showError(errorMessage);
            console.error('Error updating client:', error);
          }
        });
    } else {
      this.cancelEdit(client.clientId);
    }
  }

  /**
   * Handles new client addition from modal
   * @param name - The name of the new client
   */
  onClientAdded(name: string) {
    const trimmedName = name.trim(); // ✅ trim again for safety
  const request: ClientRequest = { name: trimmedName };
    
    this.clientService.addClient(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newClient: Client) => {
          this.clients.push(newClient);
          this.showModal = false;
          this.toastService.showSuccess('Client added successfully');
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to add client. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          
          // Disable add button temporarily on error
          this.disableAddButtonTemporarily();
          
          console.error('Error adding client:', error);
        }
      });
  }

  /**
   * Checks if a client is currently being edited
   * @param clientId - The client ID to check
   * @returns boolean indicating if the client is being edited
   */
  isEditing(clientId: number): boolean {
    return this.editingClient[clientId] || false;
  }

  /**
   * Retry loading clients when an error occurs
   */
  retryLoadClients(): void {
    this.clientService.clearErrorState();
    this.loadClients();
  }

  /**
   * Handles search criteria from the search panel
   * @param criteria - Search criteria containing the search parameters
   */
  onSearch(criteria: SearchCriteria): void {
    const name = criteria['name'] as string;
    if (name && name.trim()) {
      this.currentSearchTerm = name.trim();
      this.currentPage = 1; // Reset to first page when searching
      this.searchClients();
    }
  }

  /**
   * Performs search with pagination
   */
  private searchClients(): void {
    const page = this.currentPage - 1; // Convert to 0-based for API
    this.clientService.searchClientsByName(this.currentSearchTerm, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients: Client[]) => {
          this.clients = clients;
          // Estimate total items for pagination
          if (clients.length < this.pageSize) {
            this.totalItems = (this.currentPage - 1) * this.pageSize + clients.length;
          } else {
            this.totalItems = this.currentPage * this.pageSize + 1;
          }
          this.toastService.showSuccess(`Found ${clients.length} client(s) matching "${this.currentSearchTerm}"`);
        },
        error: (error: any) => {
          // Extract the exact error message from backend
          let errorMessage = 'Failed to search clients. Please try again.';
          if (error && error.message) {
            errorMessage = error.message;
          }
          this.toastService.showError(errorMessage);
          console.error('Error searching clients:', error);
        }
      });
  }

  /**
   * Handles clear search from the search panel
   * Reloads all clients when search is cleared
   */
  onClearSearch(): void {
    this.currentSearchTerm = '';
    this.currentPage = 1;
    this.loadClients();
  }

  /**
   * Handles page change events from pagination component
   * @param page - New page number
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    if (this.currentSearchTerm) {
      this.searchClients();
    } else {
      this.loadClients();
    }
  }

  // Observable streams from service
  // TODO: no need
  get loading$() {
    return this.clientService.loading$;
  }
  
  get error$() {
    return this.clientService.error$;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// 