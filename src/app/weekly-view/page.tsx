
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, ArrowUpCircle, ArrowDownCircle, LayoutDashboard, GanttChartSquare, BookOpen, Repeat, XCircle, CalendarDays, TrendingUp, TrendingDown, Package, Coins, Download } from 'lucide-react';
import Link from 'next/link';
import { SettingsContext } from '@/context/settings-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addWeeks, addMonths, addQuarters, startOfToday, startOfWeek, endOfWeek, isWithinInterval, subDays, isBefore } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const INCLUDED_STATUSES = ['Open', 'Pending Approval'];
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
  arItems: CashFlowItem[];
  apItems: CashFlowItem[];
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
}

const generateForecastItems = (manualTransactions: ManualTransaction[], forecastEndDate: Date): (ManualTransaction & { dueDate: Date })[] => {
  const items: (ManualTransaction & { dueDate: Date })[] = [];
  
  manualTransactions.forEach(t => {
    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
      // Generate all occurrences within the forecast window, including past ones.
      items.push({
        ...t,
        dueDate: currentDate
      });

      if (t.frequency === 'once') break;

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
  const { data, manualTransactions, excludedNames, startingBalance } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [dialogDetails, setDialogDetails] = useState<DialogDetails | null>(null);

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
      !excludedNamesSet.has(item.Name)
    ) : [];

    const forecastEndDate = addWeeks(today, 13);
    const allManualData = generateForecastItems(manualTransactions, forecastEndDate)
        .filter(item => !excludedNamesSet.has(item.name));

    const breakdown: WeeklyBreakdown[] = [];
    let currentBalance = startingBalance;
    
    // --- Overdue Calculation ---
    const overdueFileData = fileData.filter(item => item['Due Date'] && isBefore(item['Due Date'], today));
    const overdueManualData = allManualData.filter(item => isBefore(item.dueDate, today));

    const overdueArItems = overdueFileData.filter(item => INFLOW_TYPES.includes(item.Type));
    const overdueApItems = overdueFileData.filter(item => OUTFLOW_TYPES.includes(item.Type));
    const overdueManualInflows = overdueManualData.filter(t => t.type === 'inflow');
    const overdueManualOutflows = overdueManualData.filter(t => t.type === 'outflow');
    
    const overdueAR = overdueArItems.reduce((sum, item) => sum + item.RemainingAmount, 0);
    const overdueAP = overdueApItems.reduce((sum, item) => sum + item.RemainingAmount, 0);
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
      arItems: overdueArItems,
      apItems: overdueApItems,
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

        const arItems = weekFileData.filter(item => INFLOW_TYPES.includes(item.Type));
        const apItems = weekFileData.filter(item => OUTFLOW_TYPES.includes(item.Type));

        const accountsReceivable = arItems.reduce((sum, item) => sum + item.RemainingAmount, 0);
        const accountsPayable = apItems.reduce((sum, item) => sum + item.RemainingAmount, 0);
        
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
            arItems,
            apItems,
            totalInflow,
            totalOutflow,
            netFlow: netFlow,
            runningBalance: currentBalance,
        });
    }

    return breakdown;

  }, [data, manualTransactions, excludedNames, isClient, startingBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCellClick = (details: DialogDetails) => {
    if(details.total > 0) {
        setDialogDetails(details);
    }
  }
  
  const groupedDialogItems = useMemo((): GroupedItems => {
    if (!dialogDetails) return {};

    return dialogDetails.items.reduce((acc: GroupedItems, item) => {
        const isManual = 'frequency' in item;
        const name = isManual ? item.name : item.Name || 'Unnamed';
        const amount = isManual ? item.amount : item.RemainingAmount;

        if (!acc[name]) {
          acc[name] = { total: 0, items: [] };
        }
        acc[name].total += amount;
        acc[name].items.push(item);
        return acc;
      }, {});
  }, [dialogDetails]);

  return (
    <>
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
                <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold font-headline text-foreground">VizFlow</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton asChild>
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild isActive>
              <Link href="/weekly-view">
                <CalendarDays />
                <span>Weekly View</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild>
              <Link href="/data">
                <Database />
                <span>Imported Data</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <SidebarMenuButton asChild>
                <Link href="/manual-transactions">
                  <Repeat />
                  <span>Manual Transactions</span>
                </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/exclusions">
                <XCircle />
                <span>Exclusions</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/export">
                  <Download />
                  <span>Export</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/documentation">
                <BookOpen />
                <span>Documentation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold font-headline text-foreground">Weekly View</h1>
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
                                                <Repeat className="w-4 h-4 text-muted-foreground"/> {manualInflow.name}
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
                                                <Repeat className="w-4 h-4 text-muted-foreground"/> {manualOutflow.name}
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
                        <p>Please <Link href="/data" className="text-primary underline">import a file</Link> or <Link href="/manual-transactions" className="text-primary underline">add manual transactions</Link>.</p>
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
          <div className="max-h-[60vh] overflow-y-auto mt-4 p-1">
            <div className="flex items-center gap-2 text-lg font-bold mb-2" style={{ color: dialogDetails?.type === 'inflow' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
              {dialogDetails?.type === 'inflow' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
              <span>Total: {formatCurrency(dialogDetails?.total || 0)}</span>
            </div>

            <Accordion type="single" collapsible className="w-full">
                {Object.keys(groupedDialogItems).length > 0 ? (
                  Object.entries(groupedDialogItems).map(([name, group]) => (
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
                              <TableHead>Identifier</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => {
                                const isManual = 'frequency' in item;
                                const id = isManual ? `manual-${item.id}` : item['Document Number'];
                                const type = isManual ? (item.type === 'inflow' ? 'Manual Inflow' : 'Manual Outflow') : item.Type;
                                const amount = isManual ? item.amount : (item as CashFlowItem).RemainingAmount;
                                return (
                                    <TableRow key={`${id}-${index}`}>
                                        <TableCell>{isManual ? 'Recurring' : id}</TableCell>
                                        <TableCell>{type}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
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
