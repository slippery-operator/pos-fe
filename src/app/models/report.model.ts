export interface DaySalesResponse {
    date: string | number; // Unix timestamp from backend (ZonedDateTime serialized as timestamp)
    invoicedOrdersCount: number;
    invoicedItemsCount: number;
    totalRevenue: number;
}

export interface ReportRequest {
    startDate: string;
    endDate: string;
} 