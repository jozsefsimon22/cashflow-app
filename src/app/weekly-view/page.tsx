
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction, WeeklyBreakdown, GroupedItems, ForecastItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, CalendarDays, Package, Coins, ArrowUpDown, Users, Sparkles, CreditCard, ChevronDown } from 'lucide-react';
import { SettingsContext } from "@/context/settings-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isToday } from 'date-fns';
import { SidebarInset } from "@/components/ui/sidebar";
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
import { calculateWeeklyBreakdown } from '@/lib/forecast-engine';
import { Badge } from '@/components/ui/badge';


interface DialogDetails {
    title: string;
    items: ForecastItem[];
    total: number;
    type: 'inflow' | 'outflow';
    pendingTotal: number;
}

type SortKey = 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function WeeklyViewPage() {
  const { 
    data, 
    manualTransactions, 
    excludedNames, 
    startingBalance, 
    paidManualOccurrences, 
    intercompanyNames,
    directDebitNames,
    columnConfig,
  } = useContext(SettingsContext);

  const [isClient, setIsClient] = useState(false);
  const [dialogDetails, setDialogDetails] = useState<DialogDetails | null>(null);
  const [applyExclusions, setApplyExclusions] = useState(false);
  const [applyPrediction, setApplyPrediction] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'amount', direction: 'desc' });
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setApplyExclusions(columnConfig.defaultApplyExclusions);
    setApplyPrediction(columnConfig.defaultApplyPrediction);
  }, [columnConfig.defaultApplyExclusions, columnConfig.defaultApplyPrediction]);

  const weeklyBreakdown = useMemo((): WeeklyBreakdown[] => {
    if (!isClient) return [];
    
    return calculateWeeklyBreakdown({
      data,
      manualTransactions,
      paidManualOccurrences,
      startingBalance,
      excludedNames,
      intercompanyNames,
      directDebitNames,
      applyExclusions,
      applyPrediction,
    });

  }, [data, manualTransactions, paidManualOccurrences, startingBalance, excludedNames, intercompanyNames, directDebitNames, applyExclusions, applyPrediction, isClient]);

  const uniqueManualInflows = useMemo(() => {
    const seen = new Set();
    const allManuals = weeklyBreakdown.flatMap(w => w.manualInflows);
    return allManuals.filter(t => {
      const duplicate = seen.has(t.name);
      seen.add(t.name);
      return !duplicate;
    });
  }, [weeklyBreakdown]);

  const uniqueManualOutflows = useMemo(() => {
    const seen = new Set();
    const allManuals = weeklyBreakdown.flatMap(w => w.manualOutflows);
    return allManuals.filter(t => {
      const duplicate = seen.has(t.name);
      seen.add(t.name);
      return !duplicate;
    });
  }, [weeklyBreakdown]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yy');
  }

  const handleCellClick = (details: Omit<DialogDetails, 'pendingTotal'>) => {
    if(details.items.length > 0) {
        const pendingTotal = details.items
            .filter(item => 'Status' in item && item.Status === 'Pending Approval')
            .reduce((sum, item) => {
                const cashFlowItem = item as CashFlowItem;
                const amount = (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') 
                    ? -cashFlowItem.RemainingAmount 
                    : cashFlowItem.RemainingAmount;
                return sum + amount;
            }, 0);

        setDialogDetails({ ...details, pendingTotal, total: details.total });
    }
  }

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
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
            if (dialogDetails.type === 'outflow') amount = -amount;
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
      
      const getName = (item: (ForecastItem)): string => {
        if (!item) return '';
        const isManual = 'frequency' in item;
        const name = isManual ? (item as ManualTransaction).name : (item as CashFlowItem).Name;
        return name || '';
      }

      const sortedArray = Object.entries(grouped).sort(([, a], [, b]) => {
        if (sortConfig.key === 'name') {
            let nameA = getName(a.items[0]);
            let nameB = getName(b.items[0]);
            
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
      <div className="flex flex-col h-full">
        <header className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-foreground">Weekly View</h1>
              </div>
              {isClient && (data || manualTransactions.length > 0) && (
                <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-2">
                    <Switch id="prediction-toggle" checked={applyPrediction} onCheckedChange={setApplyPrediction} />
                    <Label htmlFor="prediction-toggle" className="text-sm">Predicted Cashflow</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="exclusions-toggle" checked={applyExclusions} onCheckedChange={setApplyExclusions} />
                    <Label htmlFor="exclusions-toggle" className="text-sm">Apply Exclusions</Label>
                  </div>
                </div>
              )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 pb-8">
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
                            <Accordion type="multiple" defaultValue={["inflow", "outflow"]} asChild>
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px] font-bold text-foreground sticky left-0 bg-card z-10">Category</TableHead>
                                        {weeklyBreakdown.map((week, index) => (
                                            <TableHead 
                                                key={index}
                                                className={cn(
                                                    "text-right w-36 font-semibold transition-colors", 
                                                    week.isMonthEnd && "border-r-2 border-border",
                                                    week.isCurrentWeek && "bg-primary/10",
                                                    hoveredColumn === index && "bg-muted"
                                                )}
                                                onMouseEnter={() => setHoveredColumn(index)}
                                                onMouseLeave={() => setHoveredColumn(null)}
                                            >{week.weekLabel}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <AccordionItem value="inflow" asChild>
                                  <TableBody>
                                        <TableRow className="bg-primary/5 hover:bg-primary/10">
                                            <TableCell colSpan={13 + 1} className="font-bold text-primary sticky left-0 bg-primary/5 hover:bg-primary/10 z-10 p-0">
                                                <AccordionTrigger className="p-4 hover:no-underline">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowUpCircle className="w-5 h-5" /> Inflow
                                                    </div>
                                                </AccordionTrigger>
                                            </TableCell>
                                        </TableRow>
                                        <AccordionContent asChild>
                                        <>
                                            <TableRow>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10">
                                                <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-muted-foreground"/> Accounts Receivable
                                                    </div>
                                                </TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono cursor-pointer transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && "bg-muted"
                                                        )}
                                                        onClick={() => handleCellClick({ title: `Accounts Receivable - ${week.weekLabel}`, items: week.arItems, total: week.accountsReceivable, type: 'inflow' })}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.accountsReceivable)}</TableCell>
                                                )}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10 pl-8">
                                                <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-muted-foreground"/> Intercompany Receivable
                                                    </div>
                                                </TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono cursor-pointer transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && "bg-muted"
                                                        )}
                                                        onClick={() => handleCellClick({ title: `Intercompany Receivable - ${week.weekLabel}`, items: week.intercompanyArItems, total: week.intercompanyReceivable, type: 'inflow' })}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.intercompanyReceivable)}</TableCell>
                                                )}
                                            </TableRow>
                                            {uniqueManualInflows.map(manualInflow => (
                                                <TableRow key={manualInflow.id}>
                                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-muted-foreground"/> {manualInflow.name}
                                                        </div>
                                                    </TableCell>
                                                    {weeklyBreakdown.map((week, index) => {
                                                        const items = week.manualInflows.filter(t => t.name === manualInflow.name);
                                                        const manualInflowTotal = items.reduce((sum, t) => sum + t.amount, 0);
                                                        return (
                                                            <TableCell 
                                                                key={index} 
                                                                className={cn(
                                                                    "text-right font-mono cursor-pointer transition-colors", 
                                                                    week.isMonthEnd && "border-r-2 border-border",
                                                                    week.isCurrentWeek && "bg-primary/10",
                                                                    hoveredColumn === index && "bg-muted"
                                                                )}
                                                                onClick={() => handleCellClick({ title: `${manualInflow.name} - ${week.weekLabel}`, items: items, total: manualInflowTotal, type: 'inflow' })}
                                                                onMouseEnter={() => setHoveredColumn(index)}
                                                                onMouseLeave={() => setHoveredColumn(null)}
                                                            >
                                                                {formatCurrency(manualInflowTotal)}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-secondary">
                                                <TableCell className="font-bold text-foreground sticky left-0 bg-secondary z-10">Total Inflow</TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono font-bold text-primary transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && ""
                                                        )}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.totalInflow)}</TableCell>
                                                )}
                                            </TableRow>
                                            </>
                                        </AccordionContent>
                                    </TableBody>
                                </AccordionItem>
                                
                                <AccordionItem value="outflow" asChild>
                                  <TableBody>
                                        <TableRow className="bg-destructive/5 hover:bg-destructive/10">
                                            <TableCell colSpan={13+1} className="font-bold text-destructive sticky left-0 bg-destructive/5 hover:bg-destructive/10 z-10 p-0">
                                                <AccordionTrigger className="p-4 hover:no-underline">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowDownCircle className="w-5 h-5" /> Outflow
                                                    </div>
                                                </AccordionTrigger>
                                            </TableCell>
                                        </TableRow>
                                        <AccordionContent asChild>
                                        <>
                                            <TableRow>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-muted-foreground"/> Accounts Payable
                                                    </div>
                                                </TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono cursor-pointer transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && "bg-muted"
                                                        )}
                                                        onClick={() => handleCellClick({ title: `Accounts Payable - ${week.weekLabel}`, items: week.apItems, total: week.accountsPayable, type: 'outflow' })}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.accountsPayable)}</TableCell>
                                                )}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10 pl-8">
                                                <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-muted-foreground"/> Intercompany Payable
                                                    </div>
                                                </TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono cursor-pointer transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && "bg-muted"
                                                        )}
                                                        onClick={() => handleCellClick({ title: `Intercompany Payable - ${week.weekLabel}`, items: week.intercompanyApItems, total: week.intercompanyPayable, type: 'outflow' })}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.intercompanyPayable)}</TableCell>
                                                )}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10 pl-8">
                                                <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4 text-muted-foreground"/> Direct Debit Payable
                                                    </div>
                                                </TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono cursor-pointer transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && "bg-muted"
                                                        )}
                                                        onClick={() => handleCellClick({ title: `Direct Debit Payable - ${week.weekLabel}`, items: week.directDebitPayableItems, total: week.directDebitPayable, type: 'outflow' })}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.directDebitPayable)}</TableCell>
                                                )}
                                            </TableRow>
                                            {uniqueManualOutflows.map(manualOutflow => (
                                                <TableRow key={manualOutflow.id}>
                                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                                    <div className="flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-muted-foreground"/> {manualOutflow.name}
                                                        </div>
                                                    </TableCell>
                                                    {weeklyBreakdown.map((week, index) => {
                                                        const items = week.manualOutflows.filter(t => t.name === manualOutflow.name);
                                                        const manualOutflowTotal = items.reduce((sum, t) => sum + t.amount, 0);
                                                        return (
                                                            <TableCell 
                                                                key={index} 
                                                                className={cn(
                                                                    "text-right font-mono cursor-pointer transition-colors", 
                                                                    week.isMonthEnd && "border-r-2 border-border",
                                                                    week.isCurrentWeek && "bg-primary/10",
                                                                    hoveredColumn === index && "bg-muted"
                                                                )}
                                                                onClick={() => handleCellClick({ title: `${manualOutflow.name} - ${week.weekLabel}`, items: items, total: manualOutflowTotal, type: 'outflow' })}
                                                                onMouseEnter={() => setHoveredColumn(index)}
                                                                onMouseLeave={() => setHoveredColumn(null)}
                                                            >
                                                                {formatCurrency(manualOutflowTotal)}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-secondary">
                                                <TableCell className="font-bold text-foreground sticky left-0 bg-secondary z-10">Total Outflow</TableCell>
                                                {weeklyBreakdown.map((week, index) => 
                                                    <TableCell 
                                                        key={index} 
                                                        className={cn(
                                                            "text-right font-mono font-bold text-destructive transition-colors", 
                                                            week.isMonthEnd && "border-r-2 border-border",
                                                            week.isCurrentWeek && "bg-primary/10",
                                                            hoveredColumn === index && ""
                                                        )}
                                                        onMouseEnter={() => setHoveredColumn(index)}
                                                        onMouseLeave={() => setHoveredColumn(null)}
                                                    >{formatCurrency(week.totalOutflow)}</TableCell>
                                                )}
                                            </TableRow>
                                        </>
                                        </AccordionContent>
                                    </TableBody>
                                </AccordionItem>
    
                                <TableBody>
                                  <TableRow className="border-t-2 border-border">
                                      <TableCell className="font-bold text-foreground sticky left-0 bg-card z-10">
                                          <div className="flex items-center gap-2">
                                              <Coins className="w-5 h-5" /> Net Cash Flow
                                          </div>
                                      </TableCell>
                                      {weeklyBreakdown.map((week, index) => (
                                          <TableCell 
                                              key={index} 
                                              className={cn(
                                                  "text-right font-mono font-bold transition-colors", week.netFlow >= 0 ? "text-primary" : "text-destructive", 
                                                  week.isMonthEnd && "border-r-2 border-border",
                                                  week.isCurrentWeek && "bg-primary/10",
                                                  hoveredColumn === index && "bg-muted"
                                              )}
                                              onMouseEnter={() => setHoveredColumn(index)}
                                              onMouseLeave={() => setHoveredColumn(null)}
                                          >{formatCurrency(week.netFlow)}</TableCell>
                                      ))}
                                  </TableRow>
                                  <TableRow className="border-t-2 border-border bg-secondary">
                                      <TableCell className="font-extrabold text-foreground sticky left-0 bg-secondary z-10">
                                          <div className="flex items-center gap-2">
                                              <Coins className="w-5 h-5" /> Running Balance
                                          </div>
                                      </TableCell>
                                      {weeklyBreakdown.map((week, index) => (
                                          <TableCell 
                                              key={index} 
                                              className={cn(
                                                  "text-right font-mono font-extrabold transition-colors", 
                                                  week.runningBalance >= 0 ? "text-foreground" : "text-destructive", 
                                                  week.isMonthEnd && "border-r-2 border-border",
                                                  week.isCurrentWeek && "bg-primary/10",
                                                   hoveredColumn === index && ""
                                              )}
                                              onMouseEnter={() => setHoveredColumn(index)}
                                              onMouseLeave={() => setHoveredColumn(null)}
                                          >{formatCurrency(week.runningBalance)}</TableCell>
                                      ))}
                                  </TableRow>
                                </TableBody>
                            </Table>
                            </Accordion>
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
      </div>
    </SidebarInset>

    <Dialog open={!!dialogDetails} onOpenChange={() => setDialogDetails(null)}>
        <DialogContent className="max-w-4xl">
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
              {dialogDetails && dialogDetails.pendingTotal !== 0 && (
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
                              {applyPrediction && <TableHead className="text-center">Prediction (Days)</TableHead>}
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
                                        {applyPrediction && (
                                            <TableCell className="text-center">
                                                {item.predictionAdjustment && item.predictionAdjustment > 0 ? (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-500">
                                                      <Sparkles className="w-3 h-3 mr-1.5" />
                                                      +{item.predictionAdjustment}
                                                    </Badge>
                                                ) : item.predictionAdjustment !== undefined ? (
                                                   '-'
                                                ) : null}
                                            </TableCell>
                                        )}
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
