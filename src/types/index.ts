
export interface CashFlowItem {
  Type: 'Invoice' | 'Bill' | 'Bill Credit' | 'Credit Memo';
  'Document Number': string | number;
  Name: string;
  'Due Date': Date;
  Amount: number;
  RemainingAmount: number;
  Status: string;
  Date?: Date | null;
  'Date Closed'?: Date | null;
}

export interface WeeklySummary {
  week: string;
  weekLabel: string;
  weekStart: Date;
  invoices: number;
  bills: number;
  details: CashFlowItem[];
}

export interface ColumnConfig {
  type: string;
  documentNumber: string;
  name: string;
  dueDate: string;
  amount: string;
  remainingAmount: string;
  status: string;
  date: string;
  dateClosed: string;
  dateFormat: string;
}

export interface WeeklyDetails {
  week: string;
  weekLabel: string;
  invoicesDue: number;
  billsDue: number;
  details: CashFlowItem[];
}
