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
  @Output() inventoryUploaded = new EventEmitter<any[]>();

  selectedFile: File | null = null;
  uploading = false;
  showError = false;
  errorMessage = '';
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
      this.clearError();
    }
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.setError('Please select a file to upload');
      return;
    }

    this.uploading = true;
    this.clearError();
    
    this.inventoryService.uploadInventoryTsv(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.toastService.showSuccess(`Successfully uploaded ${inventory.length} inventory records`);
          this.inventoryUploaded.emit(inventory);
          this.closeModal();
        },
        error: (error) => {
          this.setError('Failed to upload inventory file. Please check the file format.');
          this.toastService.showError('Failed to upload inventory file. Please check the file format.');
          console.error('Upload error:', error);
        },
        complete: () => {
          this.uploading = false;
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
    const sampleContent = 'productId\tquantity\n1\t100\n2\t50\n3\t75';
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

  private setError(message: string): void {
    this.showError = true;
    this.errorMessage = message;
  }

  private clearError(): void {
    this.showError = false;
    this.errorMessage = '';
  }

  private resetForm(): void {
    this.selectedFile = null;
    this.uploading = false;
    this.clearError();
  }
} 