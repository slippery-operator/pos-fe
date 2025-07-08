export interface DaySalesResponse {
    date: string;
    invoicedOrdersCount: number;
    invoicedItemsCount: number;
    totalRevenue: number;
}

export interface ReportRequest {
    startDate: string;
    endDate: string;
} 