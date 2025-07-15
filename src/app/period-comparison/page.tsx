
"use client";

import { useContext, useMemo, useState } from "react";
import { format, isBefore, isEqual, isAfter, startOfToday, addWeeks, addMonths, addQuarters } from 'date-fns';
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Scale, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { CashFlowItem, ManualTransaction, PeriodMetrics } from "@/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";


const calculateMetricsUpToDate = (
    data: CashFlowItem[] | null, 
    manualTransactions: ManualTransaction[],
    intercompanyNames: string[],
    upToDate: Date | undefined
): PeriodMetrics => {
    const baseMetrics: PeriodMetrics = {
        receivables: 0, payables: 0, net: 0,
        standardReceivables: 0, intercompanyReceivables: 0, manualReceivables: 0,
        standardPayables: 0, intercompanyPayables: 0, manualPayables: 0,
    };

    if (!upToDate) return baseMetrics;

    const intercompanyNamesSet = new Set(intercompanyNames);

    // --- Process Imported Data ---
    const relevantImportedData = (data || []).filter(item => {
        const transactionDate = item.Date;
        const closedDate = item['Date Closed'];
        
        const isCreated = transactionDate && (isBefore(transactionDate, upToDate) || isEqual(transactionDate, upToDate));
        if (!isCreated) return false;

        const isOpen = !closedDate || isAfter(closedDate, upToDate);
        return isOpen;
    });

    relevantImportedData.forEach(item => {
        const isIntercompany = intercompanyNamesSet.has(item.Name);
        if (item.Type === 'Invoice') {
            baseMetrics.receivables += item.RemainingAmount;
            if (isIntercompany) baseMetrics.intercompanyReceivables += item.RemainingAmount;
            else baseMetrics.standardReceivables += item.RemainingAmount;
        } else if (item.Type === 'Credit Memo') {
            baseMetrics.receivables -= item.RemainingAmount;
            if (isIntercompany) baseMetrics.intercompanyReceivables -= item.RemainingAmount;
            else baseMetrics.standardReceivables -= item.RemainingAmount;
        } else if (item.Type === 'Bill') {
            baseMetrics.payables += item.RemainingAmount;
            if (isIntercompany) baseMetrics.intercompanyPayables += item.RemainingAmount;
            else baseMetrics.standardPayables += item.RemainingAmount;
        } else if (item.Type === 'Bill Credit') {
            baseMetrics.payables -= item.RemainingAmount;
            if (isIntercompany) baseMetrics.intercompanyPayables -= item.RemainingAmount;
            else baseMetrics.standardPayables -= item.RemainingAmount;
        }
    });
    
    // --- Process Manual Transactions ---
    manualTransactions.forEach(t => {
        if (isAfter(t.startDate, upToDate)) return;

        const isIntercompany = intercompanyNamesSet.has(t.name);

        if (t.frequency === 'once') {
            if (t.type === 'inflow') {
                baseMetrics.receivables += t.amount;
                baseMetrics.manualReceivables += t.amount;
            } else {
                baseMetrics.payables += t.amount;
                baseMetrics.manualPayables += t.amount;
            }
        } else {
             // For recurring, count all occurrences up to the target date
            let currentDate = t.startDate;
            let i = 0;
            let occurrenceCount = 0;

            while (isBefore(currentDate, upToDate) || isEqual(currentDate, upToDate)) {
                 if (t.endCondition === 'date' && t.endDate && isAfter(currentDate, t.endDate)) {
                    break;
                }
                if (t.endCondition === 'occurrences' && t.occurrences && occurrenceCount >= t.occurrences) {
                    break;
                }

                if (t.type === 'inflow') {
                    baseMetrics.receivables += t.amount;
                    baseMetrics.manualReceivables += t.amount;
                } else {
                    baseMetrics.payables += t.amount;
                    baseMetrics.manualPayables += t.amount;
                }
                
                occurrenceCount++;
                switch (t.frequency) {
                    case 'weekly': currentDate = addWeeks(currentDate, 1); break;
                    case 'fortnightly': currentDate = addWeeks(currentDate, 2); break;
                    case 'monthly': currentDate = addMonths(currentDate, 1); break;
                    case 'quarterly': currentDate = addQuarters(currentDate, 1); break;
                }
                i++;
                if (i > 1000) break; // Safety break
            }
        }
    });

    baseMetrics.net = baseMetrics.receivables - baseMetrics.payables;
    return baseMetrics;
};


export default function PeriodComparisonPage() {
    const { data, manualTransactions, intercompanyNames } = useContext(SettingsContext);
    const [dateA, setDateA] = useState<Date | undefined>(new Date());
    const [dateB, setDateB] = useState<Date | undefined>(undefined);

    const metricsA = useMemo(() => calculateMetricsUpToDate(data, manualTransactions, intercompanyNames, dateA), [data, manualTransactions, intercompanyNames, dateA]);
    const metricsB = useMemo(() => calculateMetricsUpToDate(data, manualTransactions, intercompanyNames, dateB), [data, manualTransactions, intercompanyNames, dateB]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
    };
    
    const DatePicker = ({ date, setDate, label }: { date: Date | undefined, setDate: (d: Date | undefined) => void, label: string }) => (
         <div className="grid gap-2">
            <h3 className="text-center font-semibold">{label}</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "LLL dd, y") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
          </div>
    );
    
    const ComparisonRow = ({ title, valueA, valueB, isIncreaseGood, isSubcategory = false }: { title: string, valueA: number, valueB: number, isIncreaseGood: boolean, isSubcategory?: boolean }) => {
        const diff = valueB - valueA;
        const perc = useMemo(() => {
             if (valueA === 0) return valueB === 0 ? 0 : Infinity;
             return ((valueB - valueA) / Math.abs(valueA)) * 100;
        }, [valueA, valueB]);
        
        const hasIncreased = diff > 0;
        const hasChanged = diff !== 0;

        let colorClass = "text-muted-foreground";
        if (hasChanged) {
          colorClass = hasIncreased ? (isIncreaseGood ? "text-primary" : "text-destructive") : (isIncreaseGood ? "text-destructive" : "text-primary");
        }

        const formatPercentage = (p: number) => {
            if (p === Infinity) return <Badge variant="secondary" className="bg-green-100 text-green-800">New</Badge>;
            if (!hasChanged) return <span className="text-muted-foreground">0.0%</span>
            const plus = p > 0 ? '+' : '';
            return <span className={cn(colorClass)}>{`${plus}${p.toFixed(1)}%`}</span>;
        };

        return (
            <TableRow className={cn(!isSubcategory && "bg-secondary/50 font-semibold")}>
                <TableCell className={cn(isSubcategory && "pl-8")}>{title}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(valueA)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(valueB)}</TableCell>
                <TableCell className={cn("text-right font-mono", colorClass)}>
                    <div className="flex items-center justify-end gap-1">
                        {hasChanged && (hasIncreased ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        {formatCurrency(diff)}
                    </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                    {formatPercentage(perc)}
                </TableCell>
            </TableRow>
        );
    }
    
    const CategoryHeader = ({ title }: { title: string }) => (
        <TableRow className="bg-secondary/20">
            <TableCell colSpan={5} className="font-bold text-lg text-foreground">{title}</TableCell>
        </TableRow>
    );

  return (
    <>
      <AppSidebar activePage="period-comparison" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
           <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-headline text-foreground">Period Comparison</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Scale className="w-6 h-6" />
                        Select Dates to Compare
                    </CardTitle>
                    <CardDescription>
                        Choose two dates to compare the total balance of open transactions. The analysis includes all transactions (imported and manual) that were created on or before the selected date and were not yet closed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                        <DatePicker date={dateA} setDate={setDateA} label="Date A" />
                        <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                        <DatePicker date={dateB} setDate={setDateB} label="Date B" />
                    </div>
                </CardContent>
            </Card>

            {!data ? (
                 <Card className="mt-8 flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Please go to the <Link href="/data" className="text-primary underline font-medium">Imported Data</Link> page to upload a file with transaction history to use this feature.
                    </p>
                </Card>
            ) : !dateB ? (
                 <Card className="mt-8 flex flex-col items-center justify-center p-12 text-center border-dashed">
                     <h3 className="text-xl font-semibold font-headline text-foreground">Select Date B</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Please select a second date to see the comparison.
                    </p>
                 </Card>
            ) : (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="font-headline">Comparison Results</CardTitle>
                        <CardDescription>Comparing total balances of open transactions up to and including the selected dates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[220px]">Category</TableHead>
                                    <TableHead className="text-right">As at {dateA ? format(dateA, 'dd/MM/yy') : 'Period A'}</TableHead>
                                    <TableHead className="text-right">As at {dateB ? format(dateB, 'dd/MM/yy') : 'Period B'}</TableHead>
                                    <TableHead className="text-right">Change (£)</TableHead>
                                    <TableHead className="text-right">Change (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <CategoryHeader title="Receivables" />
                                <ComparisonRow title="Standard" valueA={metricsA.standardReceivables} valueB={metricsB.standardReceivables} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Intercompany" valueA={metricsA.intercompanyReceivables} valueB={metricsB.intercompanyReceivables} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Manual" valueA={metricsA.manualReceivables} valueB={metricsB.manualReceivables} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Total Receivables" valueA={metricsA.receivables} valueB={metricsB.receivables} isIncreaseGood={true} />

                                <CategoryHeader title="Payables" />
                                <ComparisonRow title="Standard" valueA={metricsA.standardPayables} valueB={metricsB.standardPayables} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Intercompany" valueA={metricsA.intercompanyPayables} valueB={metricsB.intercompanyPayables} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Manual" valueA={metricsA.manualPayables} valueB={metricsB.manualPayables} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Total Payables" valueA={metricsA.payables} valueB={metricsB.payables} isIncreaseGood={false} />
                                
                                <TableRow className="border-t-2 border-primary/20">
                                    <TableCell colSpan={5}></TableCell>
                                </TableRow>

                                <ComparisonRow title="Net Position" valueA={metricsA.net} valueB={metricsB.net} isIncreaseGood={true} />
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </main>
      </SidebarInset>
    </>
  );
}
