

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
  details: ForecastItem[];
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

export type ForecastItem = (CashFlowItem & { dueDate: Date, predictionAdjustment?: number }) | (ManualTransaction & { dueDate: Date, predictionAdjustment?: number });

export interface WeeklyBreakdown {
  weekLabel: string;
  accountsReceivable: number;
  intercompanyReceivable: number;
  accountsPayable: number;
  intercompanyPayable: number;
  directDebitPayable: number;
  manualInflows: (ManualTransaction & { dueDate: Date })[];
  manualOutflows: (ManualTransaction & { dueDate: Date })[];
  arItems: ForecastItem[];
  apItems: ForecastItem[];
  intercompanyArItems: ForecastItem[];
  intercompanyApItems: ForecastItem[];
  directDebitPayableItems: ForecastItem[];
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  runningBalance: number;
  isMonthEnd: boolean;
  isCurrentWeek: boolean;
}

export interface ForecastEngineParams {
    data: CashFlowItem[] | null;
    manualTransactions: ManualTransaction[];
    paidManualOccurrences: ManualTransactionOccurrence[];
    startingBalance: number;
    excludedNames: string[];
    intercompanyNames: string[];
    directDebitNames: string[];
    applyExclusions: boolean;
    applyPrediction: boolean;
}

export interface SummaryMetrics {
    totalReceivables: number;
    totalPayables: number;
    netCashFlow: number;
    forecastBalance: number;
    manualInflows: number;
    manualOutflows: number;
    pendingReceivables: number;
    pendingPayables: number;
    totalInvoices: number;
    totalBills: number;
    // New fields for breakdown charts
    intercompanyPayables: number;
    manualPayables: number;
    standardPayables: number;
    intercompanyReceivables: number;
    manualReceivables: number;
    standardReceivables: number;
    // Items for drilldown
    intercompanyPayableItems: ForecastItem[];
    manualPayableItems: ForecastItem[];
    standardPayableItems: ForecastItem[];
    intercompanyReceivableItems: ForecastItem[];
    manualReceivableItems: ForecastItem[];
    standardReceivableItems: ForecastItem[];
}

export type GroupedItems = {
  [name: string]: {
    total: number;
    items: ForecastItem[];
  };
};

export interface NamePair {
  receivableName: string;
  payableName: string;
}

export interface PeriodMetrics {
    receivables: number;
    payables: number;
    net: number;
    standardReceivables: number;
    intercompanyReceivables: number;
    manualReceivables: number;
    standardPayables: number;
    intercompanyPayables: number;
    manualPayables: number;
    // Items for drilldown
    standardReceivablesItems: ForecastItem[];
    intercompanyReceivablesItems: ForecastItem[];
    manualReceivablesItems: ForecastItem[];
    standardPayablesItems: ForecastItem[];
    intercompanyPayablesItems: ForecastItem[];
    manualPayablesItems: ForecastItem[];
}

export interface DiffDialogDetails {
    title: string;
    customerChanges: {
        name: string;
        netChange: number;
        newItems: ForecastItem[];
        closedItems: ForecastItem[];
    }[];
}
