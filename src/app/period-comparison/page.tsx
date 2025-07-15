
"use client";

import { useContext, useMemo, useState } from "react";
import { format, isBefore, isEqual } from 'date-fns';
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Scale, ArrowRight } from "lucide-react";
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

    const relevantData = data.filter(item => 
        item.Date && (isBefore(item.Date, upToDate) || isEqual(item.Date, upToDate))
    );

    let receivables = 0;
    let payables = 0;

    relevantData.forEach(item => {
        if (item.Type === 'Invoice') {
            receivables += item.Amount;
        } else if (item.Type === 'Credit Memo') {
            receivables -= item.Amount;
        } else if (item.Type === 'Bill') {
            payables += item.Amount;
        } else if (item.Type === 'Bill Credit') {
            payables -= item.Amount;
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

    const comparison = useMemo(() => {
        const diffReceivables = metricsB.receivables - metricsA.receivables;
        const diffPayables = metricsB.payables - metricsA.payables;
        const diffNet = metricsB.net - metricsA.net;

        const percChange = (oldVal: number, newVal: number) => {
            if (oldVal === 0) return newVal > 0 ? Infinity : 0;
            return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
        };
        
        return {
            diffReceivables,
            percReceivables: percChange(metricsA.receivables, metricsB.receivables),
            diffPayables,
            percPayables: percChange(metricsA.payables, metricsB.payables),
            diffNet,
            percNet: percChange(metricsA.net, metricsB.net),
        };

    }, [metricsA, metricsB]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercentage = (perc: number) => {
        if (perc === Infinity) return <Badge variant="secondary" className="bg-green-100 text-green-800">New Activity</Badge>;
        if (perc === 0 && comparison.diffReceivables === 0) return "0.0%";

        const plus = perc > 0 ? '+' : '';
        const colorClass = perc > 0 ? "text-primary" : "text-destructive";
        return <span className={cn(colorClass)}>{`${plus}${perc.toFixed(1)}%`}</span>;
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

    const ComparisonCard = ({ title, valueA, valueB }: { title: string, valueA: number, valueB: number }) => {
        const diff = valueB - valueA;
        const perc = useMemo(() => {
             if (valueA === 0) return valueB > 0 ? Infinity : 0;
             return ((valueB - valueA) / Math.abs(valueA)) * 100;
        }, [valueA, valueB]);

        const isIncreaseGood = title !== "Payables";
        const hasIncreased = diff > 0;
        const colorClass = hasIncreased ? (isIncreaseGood ? "text-primary" : "text-destructive") : (!hasIncreased && diff !== 0 ? (isIncreaseGood ? "text-destructive" : "text-primary") : "text-muted-foreground");

        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">As at {dateA ? format(dateA, 'dd/MM/yy') : 'Period A'}</span>
                        <span className="font-mono">{formatCurrency(valueA)}</span>
                    </div>
                     <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">As at {dateB ? format(dateB, 'dd/MM/yy') : 'Period B'}</span>
                        <span className="font-mono">{formatCurrency(valueB)}</span>
                    </div>
                    <hr/>
                    <div className="flex justify-between items-baseline">
                        <span className="font-semibold">Change</span>
                         <div className="text-right">
                           <p className={cn("font-mono font-bold text-lg", colorClass)}>{formatCurrency(diff)}</p>
                           <p className="text-sm">{formatPercentage(perc)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
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
                        Choose two dates to compare cumulative financial metrics. The analysis is based on transactions with a 'Date' on or before the selected dates.
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
                <div className="mt-8">
                    <h2 className="text-2xl font-bold font-headline mb-4">Comparison Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ComparisonCard title="Receivables" valueA={metricsA.receivables} valueB={metricsB.receivables} />
                        <ComparisonCard title="Payables" valueA={metricsA.payables} valueB={metricsB.payables} />
                        <ComparisonCard title="Net Position" valueA={metricsA.net} valueB={metricsB.net} />
                    </div>
                </div>
            )}
        </main>
      </SidebarInset>
    </>
  );
}
