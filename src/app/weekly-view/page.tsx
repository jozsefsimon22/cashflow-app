
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, ArrowUpCircle, ArrowDownCircle, LayoutDashboard, GanttChartSquare, BookOpen, Repeat, XCircle, CalendarDays, TrendingUp, TrendingDown, Package, Coins } from 'lucide-react';
import Link from 'next/link';
import { SettingsContext } from '@/context/settings-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, addWeeks, addMonths, addQuarters, startOfToday, startOfWeek, endOfWeek } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const INCLUDED_STATUSES = ['Open', 'Pending Approval'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

interface WeeklyBreakdown {
  weekLabel: string;
  accountsReceivable: number;
  accountsPayable: number;
  manualInflows: ManualTransaction[];
  manualOutflows: ManualTransaction[];
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
}

const generateForecastItems = (manualTransactions: ManualTransaction[], forecastEndDate: Date): (ManualTransaction & { dueDate: Date })[] => {
  const items: (ManualTransaction & { dueDate: Date })[] = [];
  
  manualTransactions.forEach(t => {
    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
      if (currentDate >= startOfToday()) {
        items.push({
          ...t,
          dueDate: currentDate
        });
      }

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
  const { data, manualTransactions, excludedNames } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const weeklyBreakdown = useMemo((): WeeklyBreakdown[] => {
    if (!isClient) return [];
    
    const excludedNamesSet = new Set(excludedNames);

    const fileData = data ? data.filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      !excludedNamesSet.has(item.Name)
    ) : [];

    const forecastEndDate = addWeeks(startOfToday(), 13);
    const manualData = generateForecastItems(manualTransactions, forecastEndDate)
        .filter(item => !excludedNamesSet.has(item.name));

    const breakdown: WeeklyBreakdown[] = [];
    const today = startOfToday();

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        // Filter imported data for the week
        const weekFileData = fileData.filter(item => {
            const dueDate = item['Due Date'];
            if (!dueDate) return false;
            const comparisonDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return comparisonDate >= weekStart && comparisonDate <= weekEnd;
        });

        // Filter manual data for the week
        const weekManualData = manualData.filter(item => {
            const dueDate = item.dueDate;
            const comparisonDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return comparisonDate >= weekStart && comparisonDate <= weekEnd;
        });

        const accountsReceivable = weekFileData
            .filter(item => INFLOW_TYPES.includes(item.Type))
            .reduce((sum, item) => sum + item.RemainingAmount, 0);

        const accountsPayable = weekFileData
            .filter(item => OUTFLOW_TYPES.includes(item.Type))
            .reduce((sum, item) => sum + item.RemainingAmount, 0);
        
        const manualInflows = weekManualData.filter(t => t.type === 'inflow');
        const manualOutflows = weekManualData.filter(t => t.type === 'outflow');

        const manualInflowTotal = manualInflows.reduce((sum, item) => sum + item.amount, 0);
        const manualOutflowTotal = manualOutflows.reduce((sum, item) => sum + item.amount, 0);
        
        const totalInflow = accountsReceivable + manualInflowTotal;
        const totalOutflow = accountsPayable + manualOutflowTotal;

        breakdown.push({
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            accountsReceivable,
            accountsPayable,
            manualInflows,
            manualOutflows,
            totalInflow,
            totalOutflow,
            netFlow: totalInflow - totalOutflow,
        });
    }

    return breakdown;

  }, [data, manualTransactions, excludedNames, isClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const ManualTransactionTooltip = ({ transactions }: { transactions: ManualTransaction[] }) => {
    if (transactions.length === 0) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="ml-2">{transactions.length}</Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="p-2 space-y-1">
              {transactions.map(t => (
                <div key={t.id} className="flex justify-between text-xs gap-4">
                  <span>{t.name}</span>
                  <span className="font-mono">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

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
                    A detailed look at your expected inflows and outflows for each of the next 12 weeks. All figures are in GBP.
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
                                    <TableCell colSpan={13} className="font-bold text-primary sticky left-0 bg-primary/5 z-10">
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
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono">{formatCurrency(week.accountsReceivable)}</TableCell>)}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                        <div className="flex items-center gap-2">
                                            <Repeat className="w-4 h-4 text-muted-foreground"/> Manual Inflows
                                            <ManualTransactionTooltip transactions={weeklyBreakdown.flatMap(w => w.manualInflows)} />
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono">{formatCurrency(week.manualInflows.reduce((sum, t) => sum + t.amount, 0))}</TableCell>)}
                                </TableRow>
                                <TableRow className="bg-secondary">
                                    <TableCell className="font-bold text-foreground sticky left-0 bg-secondary z-10">Total Inflow</TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono font-bold text-primary">{formatCurrency(week.totalInflow)}</TableCell>)}
                                </TableRow>

                                <TableRow className="bg-destructive/5">
                                    <TableCell colSpan={13} className="font-bold text-destructive sticky left-0 bg-destructive/5 z-10">
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
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono">{formatCurrency(week.accountsPayable)}</TableCell>)}
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                                       <div className="flex items-center gap-2">
                                            <Repeat className="w-4 h-4 text-muted-foreground"/> Manual Outflows
                                            <ManualTransactionTooltip transactions={weeklyBreakdown.flatMap(w => w.manualOutflows)} />
                                        </div>
                                    </TableCell>
                                    {weeklyBreakdown.map((week, index) => <TableCell key={index} className="text-right font-mono">{formatCurrency(week.manualOutflows.reduce((sum, t) => sum + t.amount, 0))}</TableCell>)}
                                </TableRow>
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
    </>
  );
}

    