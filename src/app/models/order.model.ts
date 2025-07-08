export interface Order {
    id: number;
    time: string;
    orderItems: OrderItem[];
}

export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    sellingPrice: number;
}

export interface OrderItemForm {
    barcode: string;
    quantity: number;
    mrp: number;
}

export interface OrderSearchRequest {
    startDate?: string;
    endDate?: string;
    orderId?: number;
}

export interface OrderResponse {
    id: number;
    time: string;
    orderItems: OrderItemResponse[];
}

export interface OrderItemResponse {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    sellingPrice: number;
}

export interface OrderItemWithProduct extends OrderItemResponse {
    productName: string;
    barcode: string;
} 