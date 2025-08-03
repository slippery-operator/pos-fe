import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { ToastService } from '../../services/toast.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-upload-inventory-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-inventory-modal.component.html'
})
export class UploadInventoryModalComponent {
  @Input() show: boolean = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() inventoryUploaded = new EventEmitter<void>();

  selectedFile: File | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private inventoryService: InventoryService,
    private toastService: ToastService
  ) {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.toastService.showError('Please select a file to upload');
      return;
    }

    this.inventoryService.uploadInventoryTsv(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.toastService.showSuccess('Inventory upload successful!');
            this.inventoryUploaded.emit();
            this.closeModal();
          } else if (response.status === 'error') {
            this.toastService.showError('There were problems in file uploaded. Please check response file for more details');
            // The service already handles downloading the error file
            // Don't close modal so user can try again
          }
        },
        error: (error) => {
          // This handles other types of errors (network, server errors, etc.)
          this.toastService.showError(error.message || 'Failed to upload inventory file. Please try again.');
          console.error('Upload error:', error);
        }
      });
  }

  closeModal() {
    this.show = false;
    this.showChange.emit(false);
    this.resetForm();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  downloadSampleTsv() {
    // Create sample TSV content
    const sampleContent = 'barcode\tquantity\nABC123\t100\nABC456\t50\nABC789\t75';
    const blob = new Blob([sampleContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inventory.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private resetForm(): void {
    this.selectedFile = null;
  }
} 