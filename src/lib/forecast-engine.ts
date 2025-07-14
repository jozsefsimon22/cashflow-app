

import type { CashFlowItem, ManualTransaction, ManualTransactionOccurrence, WeeklyBreakdown, SummaryMetrics, ForecastItem } from '@/types';
import { addWeeks, addMonths, addQuarters, startOfToday, isBefore, startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';

const INCLUDED_STATUSES = ['Open', 'Pending Approval', 'Unpaid'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

interface ForecastEngineParams {
    data: CashFlowItem[] | null;
    manualTransactions: ManualTransaction[];
    paidManualOccurrences: ManualTransactionOccurrence[];
    startingBalance: number;
    excludedNames: string[];
    intercompanyNames: string[];
    applyExclusions: boolean;
}

const generateForecastItems = (manualTransactions: ManualTransaction[], paidOccurrences: ManualTransactionOccurrence[]): (ManualTransaction & { dueDate: Date })[] => {
  const items: (ManualTransaction & { dueDate: Date })[] = [];
  const forecastEndDate = addWeeks(startOfToday(), 13);
  const today = startOfToday();
  const paidSet = new Set(paidOccurrences.map(p => `${p.transactionId}-${p.dueDate.toISOString()}`));
  
  manualTransactions.forEach(t => {
    let occurrenceCount = 0;
    if (t.frequency === 'once') {
        items.push({ ...t, dueDate: t.startDate });
        return;
    }

    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
      if (t.endCondition === 'date' && t.endDate && currentDate > t.endDate) {
        break;
      }
      if (t.endCondition === 'occurrences' && t.occurrences && occurrenceCount >= t.occurrences) {
        break;
      }
      
      const isPast = isBefore(currentDate, today);
      const isPaid = paidSet.has(`${t.id}-${currentDate.toISOString()}`);
      
      if(!isPaid) {
          if (isPast) {
             if (t.pastDueHandling === 'manual') {
                items.push({ ...t, dueDate: currentDate });
             }
          } else {
             items.push({ ...t, dueDate: currentDate });
          }
      }

      occurrenceCount++;
      switch (t.frequency) {
        case 'weekly': currentDate = addWeeks(currentDate, 1); break;
        case 'fortnightly': currentDate = addWeeks(currentDate, 2); break;
        case 'monthly': currentDate = addMonths(currentDate, 1); break;
        case 'quarterly': currentDate = addQuarters(currentDate, 1); break;
      }
      i++;
    }
  });

  return items;
};

export const calculateWeeklyBreakdown = ({
    data,
    manualTransactions,
    paidManualOccurrences,
    startingBalance,
    excludedNames,
    intercompanyNames,
    applyExclusions,
}: ForecastEngineParams): WeeklyBreakdown[] => {
    
    const excludedNamesSet = new Set(excludedNames);
    const intercompanyNamesSet = new Set(intercompanyNames);
    const today = startOfToday();

    const fileData = data ? data.filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    ) : [];

    const allManualData = generateForecastItems(manualTransactions, paidManualOccurrences)
        .filter(item => (!applyExclusions || !excludedNamesSet.has(item.name)));

    const getTransactionName = (item: CashFlowItem | ManualTransaction & {dueDate: Date}) => 'frequency' in item ? item.name : item.Name;
    
    const allItems: ForecastItem[] = [
        ...fileData.map(item => ({...item, dueDate: item['Due Date']!})), 
        ...allManualData
    ];

    const breakdown: WeeklyBreakdown[] = [];
    let currentBalance = startingBalance;
    
    // --- Overdue Calculation ---
    const overdueItems = allItems.filter(item => isBefore(item.dueDate, today));

    const getAmount = (sum: number, item: ForecastItem) => {
        if ('frequency' in item) { // Manual transaction - always positive, direction is handled by type
            return sum + item.amount;
        }
        // Imported data item
        const amount = (item.Type === 'Bill Credit' || item.Type === 'Credit Memo') ? -item.RemainingAmount : item.RemainingAmount;
        return sum + amount;
    };
    
    const overdueARItems = overdueItems.filter(i => ('Type' in i && (i.Type === 'Invoice' || i.Type === 'Credit Memo')) && !intercompanyNamesSet.has(getTransactionName(i)));
    const overdueIntercompanyARItems = overdueItems.filter(i => ('Type' in i && (i.Type === 'Invoice' || i.Type === 'Credit Memo')) && intercompanyNamesSet.has(getTransactionName(i)));
    const overdueManualInflowItems = overdueItems.filter(i => ('type' in i && i.type === 'inflow'));
    
    const overdueAPItems = overdueItems.filter(i => ('Type' in i && (i.Type === 'Bill' || i.Type === 'Bill Credit')) && !intercompanyNamesSet.has(getTransactionName(i)));
    const overdueIntercompanyAPItems = overdueItems.filter(i => ('Type' in i && (i.Type === 'Bill' || i.Type === 'Bill Credit')) && intercompanyNamesSet.has(getTransactionName(i)));
    const overdueManualOutflowItems = overdueItems.filter(i => ('type' in i && i.type === 'outflow'));

    const overdueAR = overdueARItems.reduce(getAmount, 0);
    const overdueIntercompanyAR = overdueIntercompanyARItems.reduce(getAmount, 0);
    const overdueManualInflows = overdueManualInflowItems.reduce(getAmount, 0);
    
    const overdueAP = overdueAPItems.reduce(getAmount, 0);
    const overdueIntercompanyAP = overdueIntercompanyAPItems.reduce(getAmount, 0);
    const overdueManualOutflows = overdueManualOutflowItems.reduce(getAmount, 0);

    const overdueTotalInflow = overdueAR + overdueIntercompanyAR + overdueManualInflows;
    const overdueTotalOutflow = overdueAP + overdueIntercompanyAP + overdueManualOutflows;
    const overdueNetFlow = overdueTotalInflow - overdueTotalOutflow;
    currentBalance += overdueNetFlow;

    breakdown.push({
      weekLabel: 'Overdue',
      accountsReceivable: overdueAR,
      intercompanyReceivable: overdueIntercompanyAR,
      accountsPayable: overdueAP,
      intercompanyPayable: overdueIntercompanyAP,
      manualInflows: overdueManualInflowItems as (ManualTransaction & {dueDate: Date})[],
      manualOutflows: overdueManualOutflowItems as (ManualTransaction & {dueDate: Date})[],
      arItems: [...overdueARItems, ...overdueIntercompanyARItems, ...overdueManualInflowItems],
      apItems: [...overdueAPItems, ...overdueIntercompanyAPItems, ...overdueManualOutflowItems],
      intercompanyArItems: overdueIntercompanyARItems,
      intercompanyApItems: overdueIntercompanyAPItems,
      totalInflow: overdueTotalInflow,
      totalOutflow: overdueTotalOutflow,
      netFlow: overdueNetFlow,
      runningBalance: currentBalance,
      isMonthEnd: false, // Overdue is never a month end
      isCurrentWeek: false,
    });
    
    // --- Future Weeks Calculation (12 weeks from today) ---
    const futureItems = allItems.filter(item => !isBefore(item.dueDate, today));

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const nextWeekStart = addWeeks(weekStart, 1);
        const isMonthEnd = weekStart.getMonth() !== nextWeekStart.getMonth();

        const weekItems = futureItems.filter(item => isWithinInterval(item.dueDate, { start: weekStart, end: weekEnd }));
        
        const arItems = weekItems.filter(item => ('Type' in item && (item.Type === 'Invoice' || item.Type === 'Credit Memo')) && !intercompanyNamesSet.has(getTransactionName(item)));
        const intercompanyArItems = weekItems.filter(item => ('Type' in item && (item.Type === 'Invoice' || item.Type === 'Credit Memo')) && intercompanyNamesSet.has(getTransactionName(item)));
        const manualInflowItems = weekItems.filter(item => 'type' in item && item.type === 'inflow');

        const apItems = weekItems.filter(item => ('Type' in item && (item.Type === 'Bill' || item.Type === 'Bill Credit')) && !intercompanyNamesSet.has(getTransactionName(item)));
        const intercompanyApItems = weekItems.filter(item => ('Type' in item && (item.Type === 'Bill' || item.Type === 'Bill Credit')) && intercompanyNamesSet.has(getTransactionName(item)));
        const manualOutflowItems = weekItems.filter(item => 'type' in item && item.type === 'outflow');
        
        const accountsReceivable = arItems.reduce(getAmount, 0);
        const intercompanyReceivable = intercompanyArItems.reduce(getAmount, 0);
        const manualInflows = manualInflowItems.reduce(getAmount, 0);

        const accountsPayable = apItems.reduce(getAmount, 0);
        const intercompanyPayable = intercompanyApItems.reduce(getAmount, 0);
        const manualOutflows = manualOutflowItems.reduce(getAmount, 0);

        const totalInflow = accountsReceivable + intercompanyReceivable + manualInflows;
        const totalOutflow = accountsPayable + intercompanyPayable + manualOutflows;
        
        const netFlow = totalInflow - totalOutflow;
        currentBalance += netFlow;

        breakdown.push({
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            accountsReceivable,
            intercompanyReceivable,
            accountsPayable,
            intercompanyPayable,
            manualInflows: manualInflowItems as (ManualTransaction & {dueDate: Date})[],
            manualOutflows: manualOutflowItems as (ManualTransaction & {dueDate: Date})[],
            arItems: [...arItems, ...intercompanyArItems, ...manualInflowItems],
            apItems: [...apItems, ...intercompanyApItems, ...manualOutflowItems],
            intercompanyArItems,
            intercompanyApItems,
            totalInflow,
            totalOutflow,
            netFlow: netFlow,
            runningBalance: currentBalance,
            isMonthEnd,
            isCurrentWeek: isWithinInterval(today, {start: weekStart, end: weekEnd})
        });
    }

    return breakdown;
};


export const calculateForecastMetrics = ({
    data,
    manualTransactions,
    paidManualOccurrences,
    startingBalance,
    excludedNames,
    intercompanyNames,
    applyExclusions,
}: ForecastEngineParams): { forecastData: ForecastItem[], summaryMetrics: SummaryMetrics } => {

    const excludedNamesSet = new Set(excludedNames);
    const intercompanyNamesSet = new Set(intercompanyNames);

    // --- Source Data Preparation ---
    const summarySourceData = (data || []).filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    );
    
    const manualDataRaw = generateForecastItems(manualTransactions, paidManualOccurrences);

    const manualDataItems: ForecastItem[] = manualDataRaw
        .filter(item => !applyExclusions || !excludedNamesSet.has(item.name))
        .map((t, i) => ({
            ...t,
            'Name': t.name,
            'Type': t.type === 'inflow' ? 'Invoice' : 'Bill',
            'Due Date': t.dueDate,
            'Amount': t.amount,
            'RemainingAmount': t.amount,
            'Status': 'Open',
            'Document Number': `manual-${t.id}-${i}`
        }));

    const forecastData = [...summarySourceData.map(i => ({...i, dueDate: i['Due Date']!})), ...manualDataItems];
    
    // --- Summary Metrics Calculation ---
    const pendingItems = summarySourceData.filter(item => item.Status === 'Pending Approval');
    const nonPendingItems = summarySourceData.filter(item => item.Status !== 'Pending Approval');
    
    // Calculate totals from non-pending data
    const totalInvoices = nonPendingItems.filter(item => item.Type === 'Invoice').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalCreditMemos = nonPendingItems.filter(item => item.Type === 'Credit Memo').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBills = nonPendingItems.filter(item => item.Type === 'Bill').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBillCredits = nonPendingItems.filter(item => item.Type === 'Bill Credit').reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    const manualInflows = manualDataItems.reduce((sum, item) => item.type === 'inflow' ? sum + item.amount : sum, 0);
    const manualOutflows = manualDataItems.reduce((sum, item) => item.type === 'outflow' ? sum + item.amount : sum, 0);

    const pendingReceivables = pendingItems.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + ((item.Type === 'Credit Memo' || item.Type === 'Bill Credit') ? -item.RemainingAmount : item.RemainingAmount), 0);
    const pendingPayables = pendingItems.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + ((item.Type === 'Bill Credit' || item.Type === 'Credit Memo') ? -item.RemainingAmount : item.RemainingAmount), 0);
    

    const totalReceivables = (totalInvoices - totalCreditMemos) + pendingReceivables;
    const totalPayables = (totalBills - totalBillCredits) + pendingPayables;
    
    const netCashFlow = (totalReceivables + manualInflows) - (totalPayables + manualOutflows);
    const forecastBalance = startingBalance + netCashFlow;


    // --- Breakdown chart calculations ---
    const allPayableItems = forecastData.filter(item => ('type' in item ? item.type === 'outflow' : OUTFLOW_TYPES.includes(item.Type)));
    const allReceivableItems = forecastData.filter(item => ('type' in item ? item.type === 'inflow' : INFLOW_TYPES.includes(item.Type)));

    const getTransactionAmount = (item: ForecastItem) => {
        if ('frequency' in item) {
            return item.amount;
        }
        return (item.Type === 'Bill Credit' || item.Type === 'Credit Memo') 
            ? -item.RemainingAmount 
            : item.RemainingAmount;
    };
    
    const intercompanyPayableItems = allPayableItems.filter(item => intercompanyNamesSet.has('Name' in item ? item.Name : item.name));
    const manualPayableItems = allPayableItems.filter(item => 'frequency' in item && !intercompanyNamesSet.has(item.name));
    const standardPayableItems = allPayableItems.filter(item => !('frequency' in item) && !intercompanyNamesSet.has(item.Name));

    const intercompanyPayables = intercompanyPayableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);
    const manualPayables = manualPayableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);
    const standardPayables = standardPayableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);

    const intercompanyReceivableItems = allReceivableItems.filter(item => intercompanyNamesSet.has('Name' in item ? item.Name : item.name));
    const manualReceivableItems = allReceivableItems.filter(item => 'frequency' in item && !intercompanyNamesSet.has(item.name));
    const standardReceivableItems = allReceivableItems.filter(item => !('frequency' in item) && !intercompanyNamesSet.has(item.Name));

    const intercompanyReceivables = intercompanyReceivableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);
    const manualReceivables = manualReceivableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);
    const standardReceivables = standardReceivableItems.reduce((sum, item) => sum + getTransactionAmount(item), 0);


    const summaryMetrics: SummaryMetrics = { 
        totalReceivables, 
        totalPayables, 
        netCashFlow, 
        forecastBalance, 
        totalInvoices, 
        totalCreditMemos, 
        totalBills, 
        totalBillCredits, 
        manualInflows,
        manualOutflows,
        pendingReceivables,
        pendingPayables,
        intercompanyPayables,
        manualPayables,
        standardPayables,
        intercompanyReceivables,
        manualReceivables,
        standardReceivables,
        intercompanyPayableItems,
        manualPayableItems,
        standardPayableItems,
        intercompanyReceivableItems,
        manualReceivableItems,
        standardReceivableItems,
    };

    return { forecastData, summaryMetrics };
}
