export interface CashFlowItem {
  Type: 'Receivable' | 'Payable';
  'Document Number': string | number;
  Name: string;
  'Due Date': Date;
  Amount: number;
}

export interface WeeklySummary {
  week: number;
  weekLabel: string;
  receivables: number;
  payables: number;
}
