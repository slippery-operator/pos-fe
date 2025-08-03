// TODO:  create types as: inventory.type.ts
export interface InventoryResponse {
    id: number;
    productId: number;
    quantity: number;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryUpdateForm {
    quantity: number;
}

export interface InventoryForm {
    productId: number;
    quantity: number;
}

export interface InventorySearchRequest {
    productName?: string;
    barcode?: string;
}

export interface InventoryUploadResponse {
    status: 'success' | 'error';
    tsvBase64?: string;
    filename?: string;
}

export interface InventoryUploadErrorResponse {
    error: string;
    message: string;
    timestamp: string;
    path: string;
} 