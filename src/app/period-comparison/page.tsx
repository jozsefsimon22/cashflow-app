
"use client";

import { useContext, useMemo, useState } from "react";
import { format, isBefore, isEqual, isAfter } from 'date-fns';
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
import type { CashFlowItem } from "@/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";


interface PeriodMetrics {
    receivables: number;
    payables: number;
    net: number;
}

const calculateMetricsUpToDate = (data: CashFlowItem[] | null, upToDate: Date | undefined): PeriodMetrics => {
    if (!data || !upToDate) {
        return { receivables: 0, payables: 0, net: 0 };
    }

    const relevantData = data.filter(item => {
        const transactionDate = item.Date;
        const closedDate = item['Date Closed'];
        
        // Transaction must exist on or before the comparison date
        const isCreated = transactionDate && (isBefore(transactionDate, upToDate) || isEqual(transactionDate, upToDate));
        if (!isCreated) return false;

        // If it has a close date, it must be after the comparison date to be considered open
        const isOpen = !closedDate || isAfter(closedDate, upToDate);
        return isOpen;
    });

    let receivables = 0;
    let payables = 0;

    relevantData.forEach(item => {
        if (item.Type === 'Invoice') {
            receivables += item.RemainingAmount;
        } else if (item.Type === 'Credit Memo') {
            receivables -= item.RemainingAmount;
        } else if (item.Type === 'Bill') {
            payables += item.RemainingAmount;
        } else if (item.Type === 'Bill Credit') {
            payables -= item.RemainingAmount;
        }
    });

    return { receivables, payables, net: receivables - payables };
};


export default function PeriodComparisonPage() {
    const { data } = useContext(SettingsContext);
    const [dateA, setDateA] = useState<Date | undefined>(new Date());
    const [dateB, setDateB] = useState<Date | undefined>(undefined);

    const metricsA = useMemo(() => calculateMetricsUpToDate(data, dateA), [data, dateA]);
    const metricsB = useMemo(() => calculateMetricsUpToDate(data, dateB), [data, dateB]);

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
    
    const ComparisonRow = ({ title, valueA, valueB, isIncreaseGood }: { title: string, valueA: number, valueB: number, isIncreaseGood: boolean }) => {
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
            <TableRow>
                <TableCell className="font-medium">{title}</TableCell>
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
                        Choose two dates to compare the total balance of open transactions. The analysis includes transactions created on or before the selected date, which were not yet closed.
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
                                    <TableHead className="w-[180px]">Category</TableHead>
                                    <TableHead className="text-right">As at {dateA ? format(dateA, 'dd/MM/yy') : 'Period A'}</TableHead>
                                    <TableHead className="text-right">As at {dateB ? format(dateB, 'dd/MM/yy') : 'Period B'}</TableHead>
                                    <TableHead className="text-right">Change (£)</TableHead>
                                    <TableHead className="text-right">Change (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <ComparisonRow title="Receivables" valueA={metricsA.receivables} valueB={metricsB.receivables} isIncreaseGood={true} />
                                <ComparisonRow title="Payables" valueA={metricsA.payables} valueB={metricsB.payables} isIncreaseGood={false} />
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
