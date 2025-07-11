
export interface CashFlowItem {
  Type: 'Invoice' | 'Bill' | 'Bill Credit' | 'Credit Memo';
  'Document Number': string | number;
  Name: string;
  'Due Date': Date | null;
  Amount: number;
  RemainingAmount: number;
  Status: string;
  Date?: Date | null;
  'Date Closed'?: Date | null;
  'Installment Due Date'?: Date | null;
  'Installment Amount'?: number | null;
  'Installment Number'?: string | null;
  'Installment Status'?: string | null;
}

export interface ManualTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'inflow' | 'outflow';
  startDate: Date;
  frequency: 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly';
  pastDueHandling?: 'auto-paid' | 'manual';
}

export interface ManualTransactionOccurrence {
  transactionId: string;
  dueDate: Date;
}

export interface WeeklySummary {
  week: string;
  weekLabel: string;
  weekStart: Date | null;
  invoices: number;
  bills: number;
  balance: number;
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
  installmentDueDate: string;
  installmentAmount: string;
  installmentNumber: string;
  installmentStatus: string;
}

export interface WeeklyDetails {
  week: string;
  weekLabel: string;
  invoicesDue: number;
  billsDue: number;
  details: CashFlowItem[];
}
