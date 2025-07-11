
export interface CashFlowItem {
  Type: 'Invoice' | 'Bill' | 'Bill Credit' | 'Credit Memo';
  'Document Number': string | number;
  Name: string;
  'Due Date': Date;
  Amount: number;
  Status: string;
}

export interface WeeklySummary {
  week: string;
  weekLabel: string;
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
  status: string;
  date: string;
  dateFormat: string;
}

export interface WeeklyDetails {
  week: string;
  weekLabel: string;
  invoicesDue: number;
  billsDue: number;
  details: CashFlowItem[];
}
