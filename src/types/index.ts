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
