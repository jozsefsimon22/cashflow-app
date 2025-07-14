

"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, WeeklyDetails, GroupedItems, SummaryMetrics, ForecastItem, WeeklyBreakdown } from '@/types';
import { BalanceChart } from '@/components/balance-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, ArrowUpCircle, ArrowDownCircle, GanttChartSquare, Wallet, TrendingUp, TrendingDown, Info, ArrowUpDown, Sparkles } from 'lucide-react';
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
import { format } from 'date-fns';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateForecastMetrics, calculateWeeklyBreakdown } from '@/lib/forecast-engine';
import { BreakdownChart } from '@/components/breakdown-chart';
import { Badge } from '@/components/ui/badge';


const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

type SortKey = 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

type BreakdownDialogData = {
  title: string;
  items: ForecastItem[];
  type: 'inflow' | 'outflow';
}

export default function Home() {
  const { 
    data, 
    startingBalance, 
    manualTransactions, 
    excludedNames, 
    paidManualOccurrences,
    intercompanyNames 
  } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyDetails | null>(null);
  const [applyExclusions, setApplyExclusions] = useState(false);
  const [applyPrediction, setApplyPrediction] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'amount', direction: 'desc' });
  const [breakdownDialogData, setBreakdownDialogData] = useState<BreakdownDialogData | null>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const { forecastData, summaryMetrics } = useMemo(() => {
    return calculateForecastMetrics({
      data,
      manualTransactions,
      paidManualOccurrences,
      startingBalance,
      excludedNames,
      intercompanyNames,
      applyExclusions,
      applyPrediction,
    });
  }, [data, manualTransactions, paidManualOccurrences, startingBalance, excludedNames, intercompanyNames, applyExclusions, applyPrediction]);
  
  const weeklyBreakdown = useMemo(() => {
    if (!isClient) return [];
    return calculateWeeklyBreakdown({
      data,
      manualTransactions,
      paidManualOccurrences,
      startingBalance,
      excludedNames,
      intercompanyNames,
      applyExclusions,
      applyPrediction,
    });
  }, [isClient, data, manualTransactions, paidManualOccurrences, startingBalance, excludedNames, intercompanyNames, applyExclusions, applyPrediction]);

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

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortGroupedItems = (items: ForecastItem[]) => {
    const groupedItems = items.reduce((acc: GroupedItems, item) => {
        const name = 'frequency' in item ? item.name : item.Name || 'Unnamed';
        if (!acc[name]) {
          acc[name] = { total: 0, items: [] };
        }
        
        let amount;
        if ('frequency' in item) { // Manual transaction
            amount = item.amount;
        } else { // CashFlowItem
            amount = (item.Type === 'Credit Memo' || item.Type === 'Bill Credit') 
                ? -item.RemainingAmount 
                : item.RemainingAmount;
        }

        acc[name].total += amount;
        acc[name].items.push(item);
        return acc;
      }, {});

    return Object.entries(groupedItems).sort(([, a], [, b]) => {
      if (sortConfig.key === 'name') {
        const nameA = a.items[0]?.Name || ('name' in a.items[0] && a.items[0].name) || '';
        const nameB = b.items[0]?.Name || ('name' in b.items[0] && b.items[0].name) || '';
        return nameA.localeCompare(nameB) * (sortConfig.direction === 'asc' ? 1 : -1);
      }
      // sort by amount
      return (a.total - b.total) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  };
  
  const weeklyDetails = useMemo(() => {
    if (!selectedWeek?.details) return { inflow: [], outflow: [] };
    const inflowItems = selectedWeek.details.filter(item => 'type' in item ? item.type === 'inflow' : INFLOW_TYPES.includes(item.Type));
    const outflowItems = selectedWeek.details.filter(item => 'type' in item ? item.type === 'outflow' : OUTFLOW_TYPES.includes(item.Type));
    return {
      inflow: sortGroupedItems(inflowItems),
      outflow: sortGroupedItems(outflowItems),
    };
  }, [selectedWeek, sortConfig]);

  const breakdownDialogDetails = useMemo(() => {
    if (!breakdownDialogData) return [];
    return sortGroupedItems(breakdownDialogData.items);
  }, [breakdownDialogData, sortConfig]);

  const handleSliceClick = (category: string, type: 'payables' | 'receivables') => {
    let items: ForecastItem[] = [];
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    
    if (type === 'payables') {
      if (category === 'Standard') items = summaryMetrics.standardPayableItems;
      if (category === 'Intercompany') items = summaryMetrics.intercompanyPayableItems;
      if (category === 'Manual') items = summaryMetrics.manualPayableItems;
    } else {
      if (category === 'Standard') items = summaryMetrics.standardReceivableItems;
      if (category === 'Intercompany') items = summaryMetrics.intercompanyReceivableItems;
      if (category === 'Manual') items = summaryMetrics.manualReceivableItems;
    }

    setBreakdownDialogData({
      title: `${categoryTitle} ${type.charAt(0).toUpperCase() + type.slice(1)} Breakdown`,
      items: items,
      type: type === 'payables' ? 'outflow' : 'inflow',
    });
  };

  return (
    <>
    <AppSidebar activePage="dashboard" />
    <SidebarInset>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
            </div>
            {isClient && (data || manualTransactions.length > 0) && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="prediction-toggle" checked={applyPrediction} onCheckedChange={setApplyPrediction} />
                  <Label htmlFor="prediction-toggle" className="text-sm">Predicted Cashflow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="exclusions-toggle" checked={applyExclusions} onCheckedChange={setApplyExclusions} />
                  <Label htmlFor="exclusions-toggle" className="text-sm">Apply Name Exclusions</Label>
                </div>
              </div>
            )}
        </div>
        <div className="space-y-8">
          {isClient && forecastData ? (
            <TooltipProvider>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Current Bank Balance</CardTitle>
                          <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
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
                              <div className="text-2xl font-bold text-primary">{formatCurrency(summaryMetrics.totalReceivables + summaryMetrics.pendingReceivables)}</div>
                              <p className="text-xs text-muted-foreground">From open items in forecast period</p>
                          </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-1 text-sm space-y-2">
                        <div className="font-bold">Receivables Calculation</div>
                         <div className="flex justify-between gap-4"><span>From Data:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalInvoices)}</span></div>
                         <div className="flex justify-between gap-4 pl-4 text-xs"><span className="text-muted-foreground">Pending Approval:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.pendingReceivables)}</span></div>
                         <div className="flex justify-between gap-4"><span>Manual Inflows:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.manualInflows)}</span></div>
                        <hr />
                        <div className="flex justify-between gap-4 font-semibold"><span>Net Total:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalReceivables + summaryMetrics.pendingReceivables)}</span></div>
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
                              <div className="text-2xl font-bold text-destructive">{formatCurrency(summaryMetrics.totalPayables + summaryMetrics.pendingPayables)}</div>
                              <p className="text-xs text-muted-foreground">From open items in forecast period</p>
                          </CardContent>
                      </Card>
                    </TooltipTrigger>
                     <TooltipContent>
                      <div className="p-1 text-sm space-y-2">
                        <div className="font-bold">Payables Calculation</div>
                        <div className="flex justify-between gap-4"><span>From Data:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalBills)}</span></div>
                         <div className="flex justify-between gap-4 pl-4 text-xs"><span className="text-muted-foreground">Pending Approval:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.pendingPayables)}</span></div>
                         <div className="flex justify-between gap-4"><span>Manual Outflows:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.manualOutflows)}</span></div>
                        <hr />
                        <div className="flex justify-between gap-4 font-semibold"><span>Net Total:</span> <span className="font-mono">{formatCurrencyTooltip(summaryMetrics.totalPayables + summaryMetrics.pendingPayables)}</span></div>
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
                  <BalanceChart data={weeklyBreakdown} onWeekSelect={handleWeekSelect} />
                </div>
                <div className="lg:col-span-1">
                  <SummaryTable data={weeklyBreakdown} onWeekSelect={handleWeekSelect} />
                </div>
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <BreakdownChart
                  title="Payables Breakdown"
                  type="payables"
                  data={{
                    Standard: summaryMetrics.standardPayables,
                    Intercompany: summaryMetrics.intercompanyPayables,
                    Manual: summaryMetrics.manualPayables,
                  }}
                  onSliceClick={(category) => handleSliceClick(category, 'payables')}
                />
                <BreakdownChart
                  title="Receivables Breakdown"
                  type="receivables"
                  data={{
                    Standard: summaryMetrics.standardReceivables,
                    Intercompany: summaryMetrics.intercompanyReceivables,
                    Manual: summaryMetrics.manualReceivables,
                  }}
                  onSliceClick={(category) => handleSliceClick(category, 'receivables')}
                />
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
            <DialogTitle>{selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              A breakdown of incoming and outgoing transactions for this week, grouped by name.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
             <Button variant="ghost" size="sm" onClick={() => requestSort('name')}>
                Sort by Name
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
             </Button>
              <Button variant="ghost" size="sm" onClick={() => requestSort('amount')}>
                Sort by Amount
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'amount' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
             </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            
            {/* Inflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <ArrowUpCircle className="w-6 h-6" />
                <span>Inflow</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(selectedWeek?.invoicesDue || 0)}</p>
              <Accordion type="single" collapsible className="w-full">
                {weeklyDetails.inflow.length > 0 ? (
                  weeklyDetails.inflow.map(([name, group]) => (
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
                              {applyPrediction && <TableHead className="text-center">Prediction (Days)</TableHead>}
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`in-detail-${index}`}>
                                <TableCell>{'Document Number' in item ? item['Document Number'] : 'Recurring'}</TableCell>
                                <TableCell>{'Type' in item ? item.Type : 'Manual'}</TableCell>
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
                                <TableCell className="text-right font-mono">{formatCurrency('RemainingAmount' in item ? item.RemainingAmount : item.amount)}</TableCell>
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
                {weeklyDetails.outflow.length > 0 ? (
                  weeklyDetails.outflow.map(([name, group]) => (
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
                              {applyPrediction && <TableHead className="text-center">Prediction (Days)</TableHead>}
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`out-detail-${index}`}>
                                <TableCell>{'Document Number' in item ? item['Document Number'] : 'Recurring'}</TableCell>
                                <TableCell>{'Type' in item ? item.Type : 'Manual'}</TableCell>
                                {applyPrediction && (
                                    <TableCell className="text-center">
                                        {/* Predictions only apply to receivables, so this will be empty */}
                                        -
                                    </TableCell>
                                )}
                                <TableCell className="text-right font-mono">{formatCurrency('RemainingAmount' in item ? item.RemainingAmount : item.amount)}</TableCell>
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
      <Dialog open={!!breakdownDialogData} onOpenChange={() => setBreakdownDialogData(null)}>
        <DialogContent className="max-w-4xl">
           <DialogHeader>
            <DialogTitle>{breakdownDialogData?.title}</DialogTitle>
            <DialogDescription>
              A detailed breakdown of all transactions in this category.
            </DialogDescription>
          </DialogHeader>
           <div className="flex items-center justify-end gap-2">
             <Button variant="ghost" size="sm" onClick={() => requestSort('name')}>
                Sort by Name
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
             </Button>
              <Button variant="ghost" size="sm" onClick={() => requestSort('amount')}>
                Sort by Amount
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'amount' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
             </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto mt-4 pr-2">
            <Accordion type="single" collapsible className="w-full">
              {breakdownDialogDetails.length > 0 ? (
                breakdownDialogDetails.map(([name, group]) => (
                  <AccordionItem value={name} key={`breakdown-${name}`}>
                    <AccordionTrigger>
                      <div className="flex justify-between w-full pr-4">
                        <span>{name}</span>
                        <span className={`font-mono ${breakdownDialogData?.type === 'inflow' ? 'text-primary' : 'text-destructive'}`}>
                          {formatCurrency(group.total)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document #</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Type</TableHead>
                            {applyPrediction && <TableHead className="text-center">Prediction (Days)</TableHead>}
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item, index) => {
                             let amount;
                              if ('frequency' in item) { // Manual transaction
                                  amount = item.amount;
                              } else { // CashFlowItem
                                  amount = (item.Type === 'Credit Memo' || item.Type === 'Bill Credit') 
                                      ? -item.RemainingAmount 
                                      : item.RemainingAmount;
                              }
                            return (
                            <TableRow key={`bd-detail-${index}`}>
                              <TableCell>{'Document Number' in item ? item['Document Number'] : 'Recurring'}</TableCell>
                              <TableCell>{format('dueDate' in item ? item.dueDate : item['Due Date']!, 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{'Type' in item ? item.Type : 'Manual'}</TableCell>
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
                              <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions in this category.</p>
              )}
            </Accordion>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

