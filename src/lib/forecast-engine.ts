
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
    const getAmount = (item: any) => {
        if ('frequency' in item) { // Manual transaction
            return item.amount;
        }
        // Imported data item
        return (item.Type === 'Bill Credit' || item.Type === 'Credit Memo') ? -item.RemainingAmount : item.RemainingAmount;
    };
    
    const allItems: ForecastItem[] = [
        ...fileData.map(item => ({...item, dueDate: item['Due Date']!})), 
        ...allManualData
    ];

    const breakdown: WeeklyBreakdown[] = [];
    let currentBalance = startingBalance;
    
    // --- Overdue Calculation ---
    const overdueItems = allItems.filter(item => isBefore(item.dueDate, today));

    const overdueARItems = overdueItems.filter(i => INFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && !intercompanyNamesSet.has(getTransactionName(i)));
    const overdueIntercompanyARItems = overdueItems.filter(i => INFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && intercompanyNamesSet.has(getTransactionName(i)));
    const overdueAPItems = overdueItems.filter(i => OUTFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && !intercompanyNamesSet.has(getTransactionName(i)));
    const overdueIntercompanyAPItems = overdueItems.filter(i => OUTFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && intercompanyNamesSet.has(getTransactionName(i)));
    
    const overdueAR = overdueARItems.reduce((sum, item) => sum + getAmount(item), 0);
    const overdueIntercompanyAR = overdueIntercompanyARItems.reduce((sum, item) => sum + getAmount(item), 0);
    const overdueAP = overdueAPItems.reduce((sum, item) => sum + getAmount(item), 0);
    const overdueIntercompanyAP = overdueIntercompanyAPItems.reduce((sum, item) => sum + getAmount(item), 0);

    const overdueTotalInflow = overdueAR + overdueIntercompanyAR;
    const overdueTotalOutflow = overdueAP + overdueIntercompanyAP;
    const overdueNetFlow = overdueTotalInflow - overdueTotalOutflow;
    currentBalance += overdueNetFlow;

    breakdown.push({
      weekLabel: 'Overdue',
      accountsReceivable: overdueAR,
      intercompanyReceivable: overdueIntercompanyAR,
      accountsPayable: overdueAP,
      intercompanyPayable: overdueIntercompanyAP,
      manualInflows: overdueItems.filter(t => 'frequency' in t && t.type === 'inflow') as (ManualTransaction & {dueDate: Date})[],
      manualOutflows: overdueItems.filter(t => 'frequency' in t && t.type === 'outflow') as (ManualTransaction & {dueDate: Date})[],
      arItems: overdueARItems,
      apItems: overdueAPItems,
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
        
        const arItems = weekItems.filter(i => INFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && !intercompanyNamesSet.has(getTransactionName(i)));
        const intercompanyArItems = weekItems.filter(i => INFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && intercompanyNamesSet.has(getTransactionName(i)));
        const apItems = weekItems.filter(i => OUTFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && !intercompanyNamesSet.has(getTransactionName(i)));
        const intercompanyApItems = weekItems.filter(i => OUTFLOW_TYPES.includes('Type' in i ? i.Type : (i.type === 'inflow' ? 'Invoice' : 'Bill')) && intercompanyNamesSet.has(getTransactionName(i)));

        const accountsReceivable = arItems.reduce((sum, item) => sum + getAmount(item), 0);
        const intercompanyReceivable = intercompanyArItems.reduce((sum, item) => sum + getAmount(item), 0);
        const accountsPayable = apItems.reduce((sum, item) => sum + getAmount(item), 0);
        const intercompanyPayable = intercompanyApItems.reduce((sum, item) => sum + getAmount(item), 0);

        const totalInflow = accountsReceivable + intercompanyReceivable;
        const totalOutflow = accountsPayable + intercompanyPayable;
        
        const netFlow = totalInflow - totalOutflow;
        currentBalance += netFlow;

        breakdown.push({
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            accountsReceivable,
            intercompanyReceivable,
            accountsPayable,
            intercompanyPayable,
            manualInflows: weekItems.filter(t => 'frequency' in t && t.type === 'inflow') as (ManualTransaction & {dueDate: Date})[],
            manualOutflows: weekItems.filter(t => 'frequency' in t && t.type === 'outflow') as (ManualTransaction & {dueDate: Date})[],
            arItems,
            apItems,
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
}: ForecastEngineParams): { forecastData: CashFlowItem[], summaryMetrics: SummaryMetrics } => {

    const excludedNamesSet = new Set(excludedNames);

    const fileData = (data || []).filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (INFLOW_TYPES.includes(item.Type) || OUTFLOW_TYPES.includes(item.Type)) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    );

    const manualDataRaw = generateForecastItems(manualTransactions, paidManualOccurrences);

    const manualData: CashFlowItem[] = manualDataRaw.map((t, i) => ({
      'Name': t.name,
      'Type': t.type === 'inflow' ? 'Invoice' : 'Bill',
      'Due Date': t.dueDate,
      'Amount': t.amount,
      'RemainingAmount': t.amount,
      'Status': 'Open',
      'Document Number': `manual-${t.id}-${i}`
    }));

    const filteredManualData = manualData.filter(item => 
      !applyExclusions || !excludedNamesSet.has(item.Name)
    );

    const forecastData = [...fileData, ...filteredManualData];
    
    // For summary cards, use the raw data to calculate base figures.
    const allIncludedSourceData = (data || []).filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    );

    const pendingItems = allIncludedSourceData.filter(item => item.Status === 'Pending Approval');
    const nonPendingItems = allIncludedSourceData.filter(item => item.Status !== 'Pending Approval');
    
    // Calculate totals from non-pending data
    const totalInvoices = nonPendingItems.filter(item => item.Type === 'Invoice').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalCreditMemos = nonPendingItems.filter(item => item.Type === 'Credit Memo').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBills = nonPendingItems.filter(item => item.Type === 'Bill').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBillCredits = nonPendingItems.filter(item => item.Type === 'Bill Credit').reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    // Calculate totals from manual transactions
    const manualInflows = filteredManualData.filter(item => item.Type === 'Invoice').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const manualOutflows = filteredManualData.filter(item => item.Type === 'Bill').reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    // Calculate totals from pending transactions
    const pendingReceivables = pendingItems.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + ((item.Type === 'Credit Memo' || item.Type === 'Bill Credit') ? -item.RemainingAmount : item.RemainingAmount), 0);
    const pendingPayables = pendingItems.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + ((item.Type === 'Credit Memo' || item.Type === 'Bill Credit') ? -item.RemainingAmount : item.RemainingAmount), 0);

    // Combine all totals for the main card display
    const totalReceivables = (totalInvoices - totalCreditMemos) + manualInflows + pendingReceivables;
    const totalPayables = (totalBills - totalBillCredits) + manualOutflows + pendingPayables;

    const netCashFlow = totalReceivables - totalPayables;
    const forecastBalance = startingBalance + forecastData.reduce((sum, item) => {
        const amount = (item.Type === 'Bill' || item.Type === 'Credit Memo') ? -item.RemainingAmount : item.RemainingAmount;
        return sum + amount;
    }, 0);


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
    };

    return { forecastData, summaryMetrics };
}
