
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Database, ArrowUpCircle, ArrowDownCircle, LayoutDashboard, GanttChartSquare, BookOpen, Repeat, XCircle, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { SettingsContext } from '@/context/settings-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addWeeks, addMonths, addQuarters, startOfToday, startOfWeek, endOfWeek } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
}

const generateForecastItems = (manualTransactions: ManualTransaction[]): (ManualTransaction & { weekStartDate: Date })[] => {
  const items: (ManualTransaction & { weekStartDate: Date })[] = [];
  const forecastEndDate = addWeeks(startOfToday(), 13);

  manualTransactions.forEach(t => {
    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
      if (currentDate >= startOfToday()) {
        items.push({
          ...t,
          weekStartDate: startOfWeek(currentDate, { weekStartsOn: 1 })
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

    const manualData = generateForecastItems(manualTransactions)
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
            const startDate = item.startDate;
            const comparisonDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
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

        breakdown.push({
            weekLabel: `w/c ${format(weekStart, 'dd/MM/yyyy')}`,
            accountsReceivable,
            accountsPayable,
            manualInflows,
            manualOutflows,
            totalInflow: accountsReceivable + manualInflowTotal,
            totalOutflow: accountsPayable + manualOutflowTotal,
        });
    }

    return breakdown;

  }, [data, manualTransactions, excludedNames, isClient]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

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
                    A detailed look at your expected inflows and outflows for each of the next 12 weeks.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isClient && (data || manualTransactions.length > 0) ? (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                    {weeklyBreakdown.map((week, index) => (
                        <AccordionItem value={`item-${index}`} key={index} className="border rounded-lg px-4 bg-background">
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full">
                                    <span className="font-semibold text-lg">{week.weekLabel}</span>
                                    <div className="flex gap-4 sm:gap-8 items-center font-mono text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm text-muted-foreground">Inflow</span>
                                            <span className="font-semibold text-primary">{formatCurrency(week.totalInflow)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm text-muted-foreground">Outflow</span>
                                            <span className="font-semibold text-destructive">{formatCurrency(week.totalOutflow)}</span>
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    {/* Inflow Details */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary flex items-center gap-2"><ArrowUpCircle className="w-5 h-5"/>Inflow Details</h4>
                                        <div className="p-4 border rounded-md bg-secondary/30">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                   <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                                   <span className="font-medium">Accounts Receivable</span>
                                                </div>
                                                <span className="font-mono">{formatCurrency(week.accountsReceivable)}</span>
                                            </div>
                                        </div>
                                        {week.manualInflows.length > 0 && (
                                            <div className="p-4 border rounded-md bg-secondary/30 space-y-2">
                                                <h5 className="font-medium flex items-center gap-2"><Repeat className="w-4 h-4 text-muted-foreground"/>Manual Inflows</h5>
                                                {week.manualInflows.map(t => (
                                                    <div key={t.id} className="flex justify-between items-center text-sm">
                                                        <span>{t.name} <Badge variant="outline" className="capitalize ml-2">{t.frequency}</Badge></span>
                                                        <span className="font-mono">{formatCurrency(t.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {week.totalInflow === 0 && <p className="text-sm text-muted-foreground text-center py-4">No inflows this week.</p>}
                                    </div>
                                    {/* Outflow Details */}
                                     <div className="space-y-3">
                                        <h4 className="font-semibold text-destructive flex items-center gap-2"><ArrowDownCircle className="w-5 h-5"/>Outflow Details</h4>
                                        <div className="p-4 border rounded-md bg-secondary/30">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">Accounts Payable</span>
                                                </div>
                                                <span className="font-mono">{formatCurrency(week.accountsPayable)}</span>
                                            </div>
                                        </div>
                                        {week.manualOutflows.length > 0 && (
                                            <div className="p-4 border rounded-md bg-secondary/30 space-y-2">
                                                <h5 className="font-medium flex items-center gap-2"><Repeat className="w-4 h-4 text-muted-foreground"/>Manual Outflows</h5>
                                                {week.manualOutflows.map(t => (
                                                    <div key={t.id} className="flex justify-between items-center text-sm">
                                                        <span>{t.name} <Badge variant="outline" className="capitalize ml-2">{t.frequency}</Badge></span>
                                                        <span className="font-mono">{formatCurrency(t.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {week.totalOutflow === 0 && <p className="text-sm text-muted-foreground text-center py-4">No outflows this week.</p>}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
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
