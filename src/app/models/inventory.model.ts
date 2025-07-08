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
    minQty?: number;
    maxQty?: number;
} 