export interface CashFlowItem {
  Type: 'Invoice' | 'Bill';
  'Document Number': string | number;
  Name: string;
  'Due Date': Date;
  Amount: number;
}

export interface WeeklySummary {
  week: number;
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
  dateFormat: string;
}

export interface WeeklyDetails {
  week: string;
  weekLabel: string;
  invoicesDue: number;
  billsDue: number;
  details: CashFlowItem[];
}
