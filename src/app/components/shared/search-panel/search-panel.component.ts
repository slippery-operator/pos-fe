import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Search field configuration interface
 */
export interface SearchField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'date';
  required?: boolean;
  max?: string;
  min?: string;
  value?: string; // Default value for the field
}

/**
 * Search criteria interface
 */
export interface SearchCriteria {
  [key: string]: string | number | null;
}

/**
 * Reusable search component that can be configured with different search fields
 * Used across multiple pages for consistent search functionality
 */
@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-panel.component.html',
  styleUrl: './search-panel.component.css'
})
export class SearchPanelComponent implements OnInit {
  @Input() searchFields: SearchField[] = [];
  @Input() title: string = 'Search';
  @Input() showSearchIcon: boolean = true;
  @Input() searchButtonText: string = 'Search';
  @Input() searchButtonSize: 'sm' | 'md' | 'lg' = 'sm';
  
  @Output() search = new EventEmitter<SearchCriteria>();
  @Output() clear = new EventEmitter<void>();

  searchValues: { [key: string]: string } = {};

  ngOnInit() {
    // Initialize search values for all fields
    this.searchFields.forEach(field => {
      this.searchValues[field.key] = field.value || '';
    });
  }

  /**
   * Handles search button click
   * Emits search criteria with non-empty values
   */
  onSearch(): void {
    const criteria: SearchCriteria = {};
    
    // Only include non-empty values in search criteria
    Object.keys(this.searchValues).forEach(key => {
      const value = this.searchValues[key]?.trim();
      if (value) {
        criteria[key] = value;
      }
    });

    this.search.emit(criteria);
  }

  /**
   * Handles clear button click
   * Resets all search values and emits clear event
   */
  onClear(): void {
    this.searchFields.forEach(field => {
      this.searchValues[field.key] = field.value || '';
    });
    this.clear.emit();
  }

  /**
   * Handles Enter key press in search inputs
   * Triggers search when Enter is pressed
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  /**
   * Handles model change for date fields to update constraints dynamically
   * @param fieldKey - The key of the field that changed
   * @param value - The new value
   */
  onModelChange(fieldKey: string, value: string): void {
    this.searchValues[fieldKey] = value;
    
    // Update date constraints dynamically
    if (fieldKey === 'startDate' || fieldKey === 'endDate') {
      this.updateDateConstraints();
    }
  }

  /**
   * Updates date field constraints based on current values
   */
  private updateDateConstraints(): void {
    const startDateValue = this.searchValues['startDate'];
    const endDateValue = this.searchValues['endDate'];
    
    // Update constraints for both date fields
    this.searchFields.forEach(field => {
      if (field.key === 'startDate') {
        // Preserve original max constraint (e.g., today's date)
        const originalMax = field.max;
        
        if (endDateValue) {
          // Start date cannot be later than end date, but also respect original max
          const effectiveMax = originalMax && endDateValue > originalMax ? originalMax : endDateValue;
          field.max = effectiveMax;
        }
      } else if (field.key === 'endDate') {
        // Preserve original max constraint (e.g., today's date)
        // End date min constraint: cannot be earlier than start date
        if (startDateValue) {
          field.min = startDateValue;
        }
      }
    });
  }

  /**
   * Checks if any search field has a value
   * @returns boolean indicating if any field has a value
   */
  hasSearchValues(): boolean {
    return Object.values(this.searchValues).some(value => value?.trim());
  }

  /**
   * Gets the Bootstrap button size class
   * @returns Bootstrap button size class
   */
  getButtonSizeClass(): string {
    switch (this.searchButtonSize) {
      case 'sm': return 'btn-sm';
      case 'md': return '';
      case 'lg': return 'btn-lg';
      default: return 'btn-sm';
    }
  }
} 