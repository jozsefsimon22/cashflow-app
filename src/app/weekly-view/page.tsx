
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction, ManualTransactionOccurrence } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, CalendarDays, Package, Coins, ArrowUpDown } from 'lucide-react';
import { SettingsContext } from "@/context/settings-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addWeeks, addMonths, addQuarters, startOfToday, startOfWeek, endOfWeek, isWithinInterval, isBefore } from 'date-fns';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';


const INCLUDED_STATUSES = ['Open', 'Pending Approval', 'Unpaid'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

type GroupedItems = {
  [name: string]: {
    total: number;
    items: (CashFlowItem | (ManualTransaction & { dueDate: Date }))[];
  };
};

interface WeeklyBreakdown {
  weekLabel: string;
  accountsReceivable: number;
  accountsPayable: number;
  manualInflows: (ManualTransaction & { dueDate: Date })[];
  manualOutflows: (ManualTransaction & { dueDate: Date })[];
  arItems: (CashFlowItem | (ManualTransaction & { dueDate: Date }))[];
  apItems: (ManualTransaction & { dueDate: Date } | CashFlowItem)[];
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  runningBalance: number;
}

interface DialogDetails {
    title: string;
    items: (CashFlowItem | (ManualTransaction & { dueDate: Date }))[];
    total: number;
    type: 'inflow' | 'outflow';
    pendingTotal: number;
}

type SortKey = 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

const generateForecastItems = (manualTransactions: ManualTransaction[], paidOccurrences: ManualTransactionOccurrence[]): (ManualTransaction & { dueDate: Date })[] => {
  const items: (ManualTransaction & { dueDate: Date })[] = [];
  const forecastEndDate = addWeeks(startOfToday(), 13);
  const today = startOfToday();
  const paidSet = new Set(paidOccurrences.map(p => `${p.transactionId}-${p.dueDate.toISOString()}`));
  
  manualTransactions.forEach(t => {
    if (t.frequency === 'once') {
        if (t.startDate >= today) {
            items.push({ ...t, dueDate: t.startDate });
        }
        return;
    }

    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
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

export default function WeeklyViewPage() {
  const { data, manualTransactions, excludedNames, startingBalance, paidManualOccurrences } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [dialogDetails, setDialogDetails] = useState<DialogDetails | null>(null);
  const [applyExclusions, setApplyExclusions] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'amount', direction: 'desc' });


  useEffect(() => {
    setIsClient(true);
  }, []);

  const uniqueManualInflows = useMemo(() => {
    const seen = new Set();
    return manualTransactions.filter(t => t.type === 'inflow').filter(t => {
      const duplicate = seen.has(t.name);
      seen.add(t.name);
      return !duplicate;
    });
  }, [manualTransactions]);

  const uniqueManualOutflows = useMemo(() => {
    const seen = new Set();
    return manualTransactions.filter(t => t.type === 'outflow').filter(t => {
      const duplicate = seen.has(t.name);
      seen.add(t.name);
      return !duplicate;
    });
  }, [manualTransactions]);


  const weeklyBreakdown = useMemo((): WeeklyBreakdown[] => {
    if (!isClient) return [];
    
    const excludedNamesSet = new Set(excludedNames);
    const today = startOfToday();

    const fileData = data ? data.filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    ) : [];

    const forecastEndDate = addWeeks(today, 13);
    const allManualData = generateForecastItems(manualTransactions, paidManualOccurrences)
        .filter(item => (!applyExclusions || !excludedNamesSet.has(item.name)));

    const breakdown: WeeklyBreakdown[] = [];
    let currentBalance = startingBalance;
    
    // --- Overdue Calculation ---
    const overdueFileData = fileData.filter(item => item['Due Date'] && isBefore(item['Due Date'], today));
    const overdueManualData = allManualData.filter(item => isBefore(item.dueDate, today));
    
    const overdueInvoices = overdueFileData.filter(item => item.Type === 'Invoice');
    const overdueCreditMemos = overdueFileData.filter(item => item.Type === 'Credit Memo');
    const overdueBills = overdueFileData.filter(item => item.Type === 'Bill');
    const overdueBillCredits = overdueFileData.filter(item => item.Type === 'Bill Credit');

    const overdueManualInflows = overdueManualData.filter(t => t.type === 'inflow');
    const overdueManualOutflows = overdueManualData.filter(t => t.type === 'outflow');
    
    const overdueAR = overdueInvoices.reduce((sum, item) => sum + item.RemainingAmount, 0) - overdueCreditMemos.reduce((sum, item) => sum + item.RemainingAmount, 0);
    const overdueAP = overdueBills.reduce((sum, item) => sum + item.RemainingAmount, 0) - overdueBillCredits.reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    const overdueManualInflowTotal = overdueManualInflows.reduce((sum, item) => sum + item.amount, 0);
    const overdueManualOutflowTotal = overdueManualOutflows.reduce((sum, item) => sum + item.amount, 0);

    const overdueTotalInflow = overdueAR + overdueManualInflowTotal;
    const overdueTotalOutflow = overdueAP + overdueManualOutflowTotal;
    const overdueNetFlow = overdueTotalInflow - overdueTotalOutflow;
    currentBalance += overdueNetFlow;

    breakdown.push({
      weekLabel: 'Overdue',
      accountsReceivable: overdueAR,
      accountsPayable: overdueAP,
      manualInflows: overdueManualInflows,
      manualOutflows: overdueManualOutflows,
      arItems: [...overdueInvoices, ...overdueCreditMemos, ...overdueManualInflows],
      apItems: [...overdueBills, ...overdueBillCredits, ...overdueManualOutflows],
      totalInflow: overdueTotalInflow,
      totalOutflow: overdueTotalOutflow,
      netFlow: overdueNetFlow,
      runningBalance: currentBalance,
    });
    
    // --- Future Weeks Calculation (12 weeks from today) ---
    const futureFileData = fileData.filter(item => item['Due Date'] && !isBefore(item['Due Date'], today));
    const futureManualData = allManualData.filter(item => !isBefore(item.dueDate, today));

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekFileData = futureFileData.filter(item => {
            const dueDate = item['Due Date'];
            if (!dueDate) return false;
            return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
        });

        const weekManualData = futureManualData.filter(item => {
            return isWithinInterval(item.dueDate, { start: weekStart, end: weekEnd });
        });

        const invoices = weekFileData.filter(item => item.Type === 'Invoice');
        const creditMemos = weekFileData.filter(item => item.Type === 'Credit Memo');
        const bills = weekFileData.filter(item => item.Type === 'Bill');
        const billCredits = weekFileData.filter(item => item.Type === 'Bill Credit');

        const accountsReceivable = invoices.reduce((sum, item) => sum + item.RemainingAmount, 0) - creditMemos.reduce((sum, item) => sum + item.RemainingAmount, 0);
        const accountsPayable = bills.reduce((sum, item) => sum + item.RemainingAmount, 0) - billCredits.reduce((sum, item) => sum + item.RemainingAmount, 0);
        
        const manualInflows = weekManualData.filter(t => t.type === 'inflow');
        const manualOutflows = weekManualData.filter(t => t.type === 'outflow');

        const manualInflowTotal = manualInflows.reduce((sum, item) => sum + item.amount, 0);
        const manualOutflowTotal = manualOutflows.reduce((sum, item) => sum + item.amount, 0);
        
        const totalInflow = accountsReceivable + manualInflowTotal;
        const totalOutflow = accountsPayable + manualOutflowTotal;
        const netFlow = totalInflow - totalOutflow;
        currentBalance += netFlow;

        breakdown.push({
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            accountsReceivable,
            accountsPayable,
            manualInflows,
            manualOutflows,
            arItems: [...invoices, ...creditMemos, ...manualInflows],
            apItems: [...bills, ...billCredits, ...manualOutflows],
            totalInflow,
            totalOutflow,
            netFlow: netFlow,
            runningBalance: currentBalance,
        });
    }

    return breakdown;

  }, [data, manualTransactions, excludedNames, isClient, startingBalance, applyExclusions, paidManualOccurrences]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yy');
  }

  const handleCellClick = (details: Omit<DialogDetails, 'pendingTotal'>) => {
    if(details.total > 0 || details.items.length > 0) {
        const pendingTotal = details.items
            .filter(item => 'Status' in item && item.Status === 'Pending Approval')
            .reduce((sum, item) => {
                const cashFlowItem = item as CashFlowItem;
                const amount = (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') 
                    ? -cashFlowItem.RemainingAmount 
                    : cashFlowItem.RemainingAmount;
                return sum + amount;
            }, 0);

        setDialogDetails({ ...details, pendingTotal });
    }
  }

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      // Optional: third click resets or changes behavior. For now, just toggle.
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const groupedDialogItems = useMemo((): [string, GroupedItems[string]][] => {
    if (!dialogDetails) return [];

    const grouped = dialogDetails.items.reduce((acc: GroupedItems, item) => {
        const isManual = 'frequency' in item;
        const name = isManual ? (item as ManualTransaction).name : (item as CashFlowItem).Name || 'Unnamed';
        
        let amount;
        if (isManual) {
            amount = (item as ManualTransaction).amount;
        } else {
            const cashFlowItem = item as CashFlowItem;
            amount = (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') 
                ? -cashFlowItem.RemainingAmount 
                : cashFlowItem.RemainingAmount;
        }

        if (!acc[name]) {
          acc[name] = { total: 0, items: [] };
        }
        acc[name].total += amount;
        acc[name].items.push(item);
        return acc;
      }, {});
      
      const getName = (item: (CashFlowItem | (ManualTransaction & { dueDate: Date }))): string => {
        if (!item) return '';
        const isManual = 'frequency' in item;
        const name = isManual ? (item as ManualTransaction).name : (item as CashFlowItem).Name;
        return name || '';
      }

      const sortedArray = Object.entries(grouped).sort(([, a], [, b]) => {
        if (sortConfig.key === 'name') {
            let nameA = getName(a.items[0]);
            let nameB = getName(b.items[0]);
            
            // Strip CUS prefix for sorting if it exists
            const cusPrefixRegex = /^CUS\d{1,5}\s+/;
            nameA = nameA.replace(cusPrefixRegex, '');
            nameB = nameB.replace(cusPrefixRegex, '');

            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        } else { // 'amount'
            return sortConfig.direction === 'asc' ? a.total - b.total : b.total - a.total;
        }
      });

      return sortedArray;

  }, [dialogDetails, sortConfig]);

  return (
    <>
    <AppSidebar activePage="weekly-view" />
    <SidebarInset>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold font-headline text-foreground">Weekly View</h1>
               {isClient && (data || manualTransactions.length > 0) && (
                  <div className="flex items-center space-x-2">
                    <Switch id="exclusions-toggle" checked={applyExclusions} onCheckedChange={setApplyExclusions} />
                    <Label htmlFor="exclusions-toggle" className="text-sm">Apply Exclusions</Label>
                  </div>
                )}
            </div>
            <SidebarTrigger />
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <CalendarDays className="w-6 h-6" />
                    12-Week Transaction Breakdown
                </CardTitle>
                <CardDescription>
                    A detailed look at your expected inflows and outflows for each of the next 12 weeks. Click on a figure to see the breakdown.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isClient && (data || manualTransactions.length > 0) ? (
                    <div className="overflow-x-auto">
                        <Table className="min-w-max">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] font-bold text-foreground sticky left-0 bg-card z-10">Category</TableHead>
                                    {weeklyBreakdown.map((week, index) => (
                                        <TableHead key={index} className="text-right w-36 font-semibold">{week.weekLabel}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-primary/5">
                                    <TableCell colSpan={13 + 1} className="font-bold text-primary sticky left-0 bg-primary/5 z-10">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpCircle className="w-5 h-5" /> Inflow
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                       <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-muted-foreground"/> Accounts Receivable
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono cursor-pointer hover:bg-muted" onClick={() => handleCellClick({ title: `Accounts Receivable - ${week.weekLabel}`, items: week.arItems, total: week.accountsReceivable, type: 'inflow' })}>{formatCurrency(week.accountsReceivable)}</TableCell>)}
                                </TableRow>
                                {uniqueManualInflows.map(manualInflow => (
                                    <TableRow key={manualInflow.id}>
                                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-muted-foreground"/> {manualInflow.name}
                                            </div>
                                        </TableCell>
                                        {weeklyBreakdown.map((week, index) => {
                                            const manualInflowTotal = week.manualInflows.filter(t => t.name === manualInflow.name).reduce((sum, t) => sum + t.amount, 0);
                                            const items = week.manualInflows.filter(t => t.name === manualInflow.name);
                                            return <TableCell key={index} className="text-right font-mono cursor-pointer hover:bg-muted" onClick={() => handleCellClick({ title: `${manualInflow.name} - ${week.weekLabel}`, items: items, total: manualInflowTotal, type: 'inflow' })}>{formatCurrency(manualInflowTotal)}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                                <TableRow className="bg-secondary">
                                    <TableCell className="font-bold text-foreground sticky left-0 bg-secondary z-10">Total Inflow</TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono font-bold text-primary">{formatCurrency(week.totalInflow)}</TableCell>)}
                                </TableRow>

                                <TableRow className="bg-destructive/5">
                                    <TableCell colSpan={13 + 1} className="font-bold text-destructive sticky left-0 bg-destructive/5 z-10">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownCircle className="w-5 h-5" /> Outflow
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-muted-foreground"/> Accounts Payable
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono cursor-pointer hover:bg-muted" onClick={() => handleCellClick({ title: `Accounts Payable - ${week.weekLabel}`, items: week.apItems, total: week.accountsPayable, type: 'outflow' })}>{formatCurrency(week.accountsPayable)}</TableCell>)}
                                </TableRow>
                                {uniqueManualOutflows.map(manualOutflow => (
                                    <TableRow key={manualOutflow.id}>
                                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                                           <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-muted-foreground"/> {manualOutflow.name}
                                            </div>
                                        </TableCell>
                                        {weeklyBreakdown.map((week, index) => {
                                            const manualOutflowTotal = week.manualOutflows.filter(t => t.name === manualOutflow.name).reduce((sum, t) => sum + t.amount, 0);
                                            const items = week.manualOutflows.filter(t => t.name === manualOutflow.name);
                                            return <TableCell key={index} className="text-right font-mono cursor-pointer hover:bg-muted" onClick={() => handleCellClick({ title: `${manualOutflow.name} - ${week.weekLabel}`, items: items, total: manualOutflowTotal, type: 'outflow' })}>{formatCurrency(manualOutflowTotal)}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                                <TableRow className="bg-secondary">
                                    <TableCell className="font-bold text-foreground sticky left-0 bg-secondary z-10">Total Outflow</TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono font-bold text-destructive">{formatCurrency(week.totalOutflow)}</TableCell>)}
                                </TableRow>

                                <TableRow className="border-t-2 border-border">
                                    <TableCell className="font-bold text-foreground sticky left-0 bg-card z-10">
                                        <div className="flex items-center gap-2">
                                            <Coins className="w-5 h-5" /> Net Cash Flow
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => (
                                        <TableCell key={index} className={cn("text-right font-mono font-bold", week.netFlow >= 0 ? "text-primary" : "text-destructive")}>
                                            {formatCurrency(week.netFlow)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                <TableRow className="border-t-2 border-border bg-secondary">
                                    <TableCell className="font-extrabold text-foreground sticky left-0 bg-secondary z-10">
                                        <div className="flex items-center gap-2">
                                            <Coins className="w-5 h-5" /> Running Balance
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => (
                                        <TableCell key={index} className={cn("text-right font-mono font-extrabold", week.runningBalance >= 0 ? "text-foreground" : "text-destructive")}>
                                            {formatCurrency(week.runningBalance)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                   <div className="text-center text-muted-foreground py-10">
                        <p>No data available to display.</p>
                        <p>Please <a href="/data" className="text-primary underline">import a file</a> or <a href="/manual-transactions" className="text-primary underline">add manual transactions</a>.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </SidebarInset>

    <Dialog open={!!dialogDetails} onOpenChange={() => setDialogDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogDetails?.title}</DialogTitle>
            <DialogDescription>
              A breakdown of transactions for this category, grouped by name.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold" style={{ color: dialogDetails?.type === 'inflow' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                  {dialogDetails?.type === 'inflow' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                  <span>Total: {formatCurrency(dialogDetails?.total || 0)}</span>
              </div>
              {dialogDetails && dialogDetails.pendingTotal > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                      (Pending Approval: {formatCurrency(dialogDetails.pendingTotal)})
                  </p>
              )}
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={() => requestSort('name')}>
                    Sort by Name
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
                  <Button variant="ghost" size="sm" onClick={() => requestSort('amount')}>
                    Sort by Amount
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'amount' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto mt-4 p-1">
            <Accordion type="single" collapsible className="w-full">
                {groupedDialogItems.length > 0 ? (
                  groupedDialogItems.map(([name, group]) => (
                    <AccordionItem value={name} key={name}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{name}</span>
                          <span className="font-mono" style={{ color: dialogDetails?.type === 'inflow' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>{formatCurrency(group.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Details</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => {
                                const isManual = 'frequency' in item;
                                const id = isManual ? 'Recurring' : (item as CashFlowItem)['Document Number'];
                                const type = isManual ? (item.type === 'inflow' ? 'Manual Inflow' : 'Manual Outflow') : (item as CashFlowItem).Type;
                                const dueDate = isManual ? (item as any).dueDate : (item as CashFlowItem)['Due Date'];
                                
                                let amount;
                                if (isManual) {
                                    amount = item.amount;
                                } else {
                                    const cashFlowItem = item as CashFlowItem;
                                    amount = cashFlowItem.RemainingAmount;
                                }
                                
                                const amountDisplay = (type === 'Credit Memo' || type === 'Bill Credit') ? -amount : amount;

                                return (
                                    <TableRow key={`${id}-${index}`}>
                                        <TableCell>
                                          <div>{id}</div>
                                          {dueDate && <div className="text-xs text-muted-foreground">{formatDate(dueDate)}</div>}
                                        </TableCell>
                                        <TableCell>{type}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(amountDisplay)}</TableCell>
                                    </TableRow>
                                )
                            })}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No transactions in this category for this week.</p>
                )}
              </Accordion>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
