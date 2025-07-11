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
}

export interface ColumnConfig {
  type: string;
  documentNumber: string;
  name: string;
  dueDate: string;
  amount: string;
  dateFormat: string;
}
