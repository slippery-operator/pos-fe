export interface Product {
    id: number;
    barcode: string;
    clientId: number;
    name: string;
    mrp: number;
    imageUrl?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProductRequest {
    barcode: string;
    clientId: number;
    name: string;
    mrp: number;
    imageUrl?: string;
}

export interface ProductSearchRequest {
    barcode?: string;
    clientId?: number;
    productName?: string;
}

export interface ProductUpdateRequest {
    name: string;
    mrp: number;
    imageUrl?: string;
} 