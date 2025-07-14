

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
  endCondition: 'never' | 'date' | 'occurrences';
  endDate?: Date;
  occurrences?: number;
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

export interface CustomerScore {
  name: string;
  totalPaid: number;
  onTime: number;
  late: number;
  avgDaysLate: number;
  paymentScore: number;
  totalValue: number;
  invoices: CashFlowItem[];
}

export type ForecastItem = CashFlowItem | (ManualTransaction & { dueDate: Date });

export interface WeeklyBreakdown {
  weekLabel: string;
  accountsReceivable: number;
  intercompanyReceivable: number;
  accountsPayable: number;
  intercompanyPayable: number;
  manualInflows: (ManualTransaction & { dueDate: Date })[];
  manualOutflows: (ManualTransaction & { dueDate: Date })[];
  arItems: ForecastItem[];
  apItems: ForecastItem[];
  intercompanyArItems: ForecastItem[];
  intercompanyApItems: ForecastItem[];
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  runningBalance: number;
  isMonthEnd: boolean;
  isCurrentWeek: boolean;
}

export interface SummaryMetrics {
    totalReceivables: number;
    totalPayables: number;
    netCashFlow: number;
    forecastBalance: number;
    totalInvoices: number;
    totalCreditMemos: number;
    totalBills: number;
    totalBillCredits: number;
    manualInflows: number;
    manualOutflows: number;
    pendingReceivables: number;
    pendingPayables: number;
    // New fields for breakdown charts
    intercompanyPayables: number;
    manualPayables: number;
    standardPayables: number;
    intercompanyReceivables: number;
    manualReceivables: number;
    standardReceivables: number;
}

export type GroupedItems = {
  [name: string]: {
    total: number;
    items: ForecastItem[];
  };
};
