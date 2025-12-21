export interface Invoice {
    id: string;
    date: string;
    location: string;
    stall: string;
    amount: number;
    status: 'Processed' | 'Pending';
    serviceDateRange?: string;
    pdfUrl?: string;
}
