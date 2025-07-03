import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddClientModalComponent } from '../../components/add-client-modal/add-client-modal.component';
import { Client, ClientRequest } from '../../models/client.model';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-cms',
  standalone: true,
  imports: [CommonModule, FormsModule, AddClientModalComponent],
  templateUrl: './cms.component.html',
  styleUrl: './cms.component.css'
})
export class CmsComponent implements OnInit{
  clients: Client[] = [];
  loading = false;
  error = '';
  showModal = false;
  editingClient: { [key: number]: boolean } = {};
  editingName: { [key: number]: string } = {};
  editingErrors: { [key: number]: string } = {};

  constructor(private clientService: ClientService) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading = true;
    this.error = '';
    
    this.clientService.getClients().subscribe({
      next: (clients: Client[]) => {
        this.clients = clients;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to load clients';
        this.loading = false;
        console.error('Error loading clients:', error);
      }
    });
  }

  startEdit(client: Client) {
    this.editingClient[client.clientId] = true;
    this.editingName[client.clientId] = client.name;
    this.editingErrors[client.clientId] = '';
  }

  cancelEdit(clientId: number) {
    this.editingClient[clientId] = false;
    delete this.editingName[clientId];
    delete this.editingErrors[clientId];
  }

  validateEditingName(clientId: number): void {
    const name = this.editingName[clientId];
    const trimmedName = name ? name.trim() : '';
    
    if (trimmedName.length === 0) {
      this.editingErrors[clientId] = 'Client name cannot be empty';
    } else if (trimmedName.length > 255) {
      this.editingErrors[clientId] = 'Client name cannot exceed 255 characters';
    } else {
      this.editingErrors[clientId] = '';
    }
  }

  isValidEdit(clientId: number): boolean {
    const name = this.editingName[clientId];
    const trimmedName = name ? name.trim() : '';
    return trimmedName.length > 0 && trimmedName.length <= 255 && !this.editingErrors[clientId];
  }

  saveEdit(client: Client) {
    const newName = this.editingName[client.clientId];
    this.validateEditingName(client.clientId);
    
    if (!this.isValidEdit(client.clientId)) {
      return;
    }
    
    const trimmedName = newName.trim();
    if (trimmedName !== client.name) {
      const request: ClientRequest = { name: trimmedName };
      
      this.clientService.updateClient(client.clientId, request).subscribe({
        next: (updatedClient: Client) => {
          const index = this.clients.findIndex(c => c.clientId === client.clientId);
          if (index !== -1) {
            this.clients[index] = updatedClient;
          }
          this.editingClient[client.clientId] = false;
          delete this.editingName[client.clientId];
          delete this.editingErrors[client.clientId];
        },
        error: (error: any) => {
          this.error = 'Failed to update client';
          console.error('Error updating client:', error);
        }
      });
    } else {
      this.cancelEdit(client.clientId);
    }
  }

  onClientAdded(name: string) {
    const request: ClientRequest = { name };
    
    this.clientService.addClient(request).subscribe({
      next: (newClient: Client) => {
        this.clients.push(newClient);
        this.showModal = false;
      },
      error: (error: any) => {
        this.error = 'Failed to add client';
        console.error('Error adding client:', error);
      }
    });
  }

  isEditing(clientId: number): boolean {
    return this.editingClient[clientId] || false;
  }
}
