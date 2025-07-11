
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, ManualTransaction, WeeklyDetails } from '@/types';
import { BalanceChart } from '@/components/balance-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Settings, Database, ArrowUpCircle, ArrowDownCircle, LayoutDashboard, GanttChartSquare, Wallet, TrendingUp, TrendingDown, BookOpen, Landmark, Repeat, XCircle, CalendarDays, Info, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SettingsContext } from '@/context/settings-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addWeeks, addMonths, addQuarters, startOfToday } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const INCLUDED_STATUSES = ['Open', 'Pending Approval'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];


type GroupedItems = {
  [name: string]: {
    total: number;
    items: CashFlowItem[];
  };
};

const generateForecastItems = (manualTransactions: ManualTransaction[]): CashFlowItem[] => {
  const items: CashFlowItem[] = [];
  const forecastEndDate = addWeeks(startOfToday(), 13); // 12 weeks into the future + buffer

  manualTransactions.forEach(t => {
    let currentDate = t.startDate;
    let i = 0; // safety break
    while (currentDate <= forecastEndDate && i < 1000) {
      if (currentDate >= startOfToday()) {
        items.push({
          'Name': t.name,
          'Type': t.type === 'inflow' ? 'Invoice' : 'Bill', // Treat as standard types
          'Due Date': currentDate,
          'Amount': t.amount,
          'RemainingAmount': t.amount,
          'Status': 'Open',
          'Document Number': `manual-${t.id}-${i}`
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

export default function Home() {
  const { data, startingBalance, manualTransactions, excludedNames } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyDetails | null>(null);
  const [applyExclusions, setApplyExclusions] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const forecastData = useMemo(() => {
    if (!data) return null;
    
    const excludedNamesSet = new Set(excludedNames);

    const fileData = data.filter(item => 
      item.Status && 
      INCLUDED_STATUSES.includes(item.Status) &&
      (INFLOW_TYPES.includes(item.Type) || OUTFLOW_TYPES.includes(item.Type)) &&
      (!applyExclusions || !excludedNamesSet.has(item.Name))
    );
    const manualData = generateForecastItems(manualTransactions);

    const filteredManualData = manualData.filter(item => 
      !applyExclusions || !excludedNamesSet.has(item.Name)
    );

    return [...fileData, ...filteredManualData];
  }, [data, manualTransactions, excludedNames, applyExclusions]);
  
  const handleWeekSelect = (weekData: WeeklyDetails) => {
    setSelectedWeek(weekData);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };
   const formatCurrencyTooltip = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const summaryMetrics = useMemo(() => {
    if (!forecastData) return { totalReceivables: 0, totalPayables: 0, netCashFlow: 0, forecastBalance: startingBalance, totalInvoices: 0, totalCreditMemos: 0, totalBills: 0, totalBillCredits: 0, totalInvoicesPending: 0, totalBillsPending: 0, totalInvoicesOpen: 0, totalBillsOpen: 0 };

    const invoices = forecastData.filter(item => item.Type === 'Invoice');
    const creditMemos = forecastData.filter(item => item.Type === 'Credit Memo');
    const bills = forecastData.filter(item => item.Type === 'Bill');
    const billCredits = forecastData.filter(item => item.Type === 'Bill Credit');

    const totalInvoices = invoices.reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalCreditMemos = creditMemos.reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBills = bills.reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBillCredits = billCredits.reduce((sum, item) => sum + item.RemainingAmount, 0);

    const totalInvoicesPending = invoices.filter(item => item.Status === 'Pending Approval').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBillsPending = bills.filter(item => item.Status === 'Pending Approval').reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    const totalInvoicesOpen = invoices.filter(item => item.Status === 'Open').reduce((sum, item) => sum + item.RemainingAmount, 0);
    const totalBillsOpen = bills.filter(item => item.Status === 'Open').reduce((sum, item) => sum + item.RemainingAmount, 0);

    const totalReceivables = totalInvoices - totalCreditMemos;
    const totalPayables = totalBills - totalBillCredits;

    const netCashFlow = totalReceivables - totalPayables;
    const forecastBalance = startingBalance + netCashFlow;

    return { totalReceivables, totalPayables, netCashFlow, forecastBalance, totalInvoices, totalCreditMemos, totalBills, totalBillCredits, totalInvoicesPending, totalBillsPending, totalInvoicesOpen, totalBillsOpen };
}, [forecastData, startingBalance]);

  const weeklyDetails = useMemo(() => {
    if (!selectedWeek?.details) return { inflow: {}, outflow: {} };

    const groupItems = (items: CashFlowItem[]): GroupedItems => {
      return items.reduce((acc: GroupedItems, item) => {
        const name = item.Name || 'Unnamed';
        if (!acc[name]) {
          acc[name] = { total: 0, items: [] };
        }
        acc[name].total += item.RemainingAmount;
        acc[name].items.push(item);
        return acc;
      }, {});
    };

    const inflowItems = selectedWeek.details.filter(item => INFLOW_TYPES.includes(item.Type));
    const outflowItems = selectedWeek.details.filter(item => OUTFLOW_TYPES.includes(item.Type));

    return {
      inflow: groupItems(inflowItems),
      outflow: groupItems(outflowItems),
    };
  }, [selectedWeek]);

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
             <SidebarMenuButton asChild isActive>
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <SidebarMenuButton asChild>
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
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
                {isClient && data && (
                  <div className="flex items-center space-x-2">
                    <Switch id="exclusions-toggle" checked={applyExclusions} onCheckedChange={setApplyExclusions} />
                    <Label htmlFor="exclusions-toggle" className="text-sm">Apply Exclusions</Label>
                  </div>
                )}
            </div>
            <SidebarTrigger />
        </div>
        <div className="space-y-8">
          {isClient && forecastData ? (
            <TooltipProvider>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Current Bank Balance</CardTitle>
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(startingBalance)}</div>
                          <p className="text-xs text-muted-foreground">As configured in settings</p>
                      </CardContent>
                  </Card>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-1.5">Total Receivables <Info className="w-3 h-3 text-muted-foreground" /></CardTitle>
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-primary">{formatCurrency(summaryMetrics.totalReceivables)}</div>
                              <p className="text-xs text-muted-foreground">From 'Open' invoices in forecast</p>
                          </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-1 text-sm space-y-2">
                        <div className="font-bold">Receivables Calculation</div>
                        <div className="flex justify-between gap-4"><span>Total Invoices:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalInvoices)}</span></div>
                        {summaryMetrics.totalInvoicesOpen > 0 && (
                          <div className="flex justify-between gap-4 pl-4 text-xs text-muted-foreground"><span>(Open):</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalInvoicesOpen)}</span></div>
                        )}
                        {summaryMetrics.totalInvoicesPending > 0 && (
                          <div className="flex justify-between gap-4 pl-4 text-xs text-muted-foreground"><span>(Pending Approval):</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalInvoicesPending)}</span></div>
                        )}
                        <div className="flex justify-between gap-4"><span>Credit Memos:</span> <span className="font-mono">- {formatCurrencyTooltip(summaryMetrics.totalCreditMemos)}</span></div>
                        <hr />
                        <div className="flex justify-between gap-4 font-semibold"><span>Net Total:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalReceivables)}</span></div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-1.5">Total Payables <Info className="w-3 h-3 text-muted-foreground" /></CardTitle>
                              <TrendingDown className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-destructive">{formatCurrency(summaryMetrics.totalPayables)}</div>
                              <p className="text-xs text-muted-foreground">From 'Open' bills in forecast</p>
                          </CardContent>
                      </Card>
                    </TooltipTrigger>
                     <TooltipContent>
                      <div className="p-1 text-sm space-y-2">
                        <div className="font-bold">Payables Calculation</div>
                        <div className="flex justify-between gap-4"><span>Total Bills:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalBills)}</span></div>
                        {summaryMetrics.totalBillsOpen > 0 && (
                          <div className="flex justify-between gap-4 pl-4 text-xs text-muted-foreground"><span>(Open):</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalBillsOpen)}</span></div>
                        )}
                         {summaryMetrics.totalBillsPending > 0 && (
                          <div className="flex justify-between gap-4 pl-4 text-xs text-muted-foreground"><span>(Pending Approval):</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalBillsPending)}</span></div>
                        )}
                        <div className="flex justify-between gap-4"><span>Bill Credits:</span> <span className="font-mono">- {formatCurrencyTooltip(summaryMetrics.totalBillCredits)}</span></div>
                        <hr />
                        <div className="flex justify-between gap-4 font-semibold"><span>Net Total:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalPayables)}</span></div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                   <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Forecast Balance</CardTitle>
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.forecastBalance)}</div>
                          <p className="text-xs text-muted-foreground">End balance after 12 weeks</p>
                      </CardContent>
                  </Card>
              </div>
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <BalanceChart data={forecastData} onWeekSelect={handleWeekSelect} />
                </div>
                <div className="lg:col-span-1">
                  <SummaryTable data={forecastData} onWeekSelect={handleWeekSelect} />
                </div>
              </div>
            </TooltipProvider>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
              <div className="bg-secondary p-4 rounded-full mb-4">
                <Database className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                No data has been imported yet. Go to the <Link href="/data" className="text-primary underline font-medium">Imported Data</Link> page to upload your file and see your cash flow analysis.
              </p>
            </Card>
          )}
        </div>
      </main>
    </SidebarInset>
    <Dialog open={!!selectedWeek} onOpenChange={() => setSelectedWeek(null)}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Details for {selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              A breakdown of incoming and outgoing transactions for this week, grouped by name.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            
            {/* Inflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <ArrowUpCircle className="w-6 h-6" />
                <span>Inflow</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(selectedWeek?.invoicesDue || 0)}</p>
              <Accordion type="single" collapsible className="w-full">
                {Object.keys(weeklyDetails.inflow).length > 0 ? (
                  Object.entries(weeklyDetails.inflow).map(([name, group]) => (
                    <AccordionItem value={name} key={`inflow-${name}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{name}</span>
                          <span className="font-mono text-primary">{formatCurrency(group.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Document #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`in-detail-${index}`}>
                                <TableCell>{item['Document Number']}</TableCell>
                                <TableCell>{item.Type}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.RemainingAmount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No inflow this week.</p>
                )}
              </Accordion>
            </div>

            {/* Outflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-destructive">
                <ArrowDownCircle className="w-6 h-6" />
                <span>Outflow</span>
              </div>
              <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(selectedWeek?.billsDue || 0)}</p>
              <Accordion type="single" collapsible className="w-full">
                {Object.keys(weeklyDetails.outflow).length > 0 ? (
                  Object.entries(weeklyDetails.outflow).map(([name, group]) => (
                    <AccordionItem value={name} key={`outflow-${name}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{name}</span>
                          <span className="font-mono text-destructive">{formatCurrency(group.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Document #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`out-detail-${index}`}>
                                <TableCell>{item['Document Number']}</TableCell>
                                <TableCell>{item.Type}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.RemainingAmount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No outflow this week.</p>
                )}
              </Accordion>
            </div>
            
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
