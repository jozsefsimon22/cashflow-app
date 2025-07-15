
"use client";

import { useContext, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval, startOfToday } from 'date-fns';
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Scale, TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";
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

const calculateMetricsForPeriod = (data: CashFlowItem[] | null, period: DateRange | undefined): PeriodMetrics => {
    if (!data || !period || !period.from || !period.to) {
        return { receivables: 0, payables: 0, net: 0 };
    }

    const periodData = data.filter(item => 
        item['Date Closed'] && isWithinInterval(item['Date Closed'], { start: period.from!, end: period.to! })
    );

    let receivables = 0;
    let payables = 0;

    periodData.forEach(item => {
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
    const today = startOfToday();
    const [periodA, setPeriodA] = useState<DateRange | undefined>({ from: addDays(today, -30), to: today });
    const [periodB, setPeriodB] = useState<DateRange | undefined>(undefined);

    const metricsA = useMemo(() => calculateMetricsForPeriod(data, periodA), [data, periodA]);
    const metricsB = useMemo(() => calculateMetricsForPeriod(data, periodB), [data, periodB]);

    const comparison = useMemo(() => {
        const diffReceivables = metricsB.receivables - metricsA.receivables;
        const diffPayables = metricsB.payables - metricsA.payables;
        const diffNet = metricsB.net - metricsA.net;

        const percChange = (oldVal: number, newVal: number) => {
            if (oldVal === 0) return newVal > 0 ? Infinity : 0;
            return ((newVal - oldVal) / oldVal) * 100;
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
        return <span className={cn(perc > 0 ? "text-primary" : "text-destructive")}>{`${plus}${perc.toFixed(1)}%`}</span>;
    };
    
    const DateRangePicker = ({ period, setPeriod, label }: { period: DateRange | undefined, setPeriod: (p: DateRange | undefined) => void, label: string }) => (
         <div className="grid gap-2">
            <h3 className="text-center font-semibold">{label}</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !period && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {period?.from ? (
                    period.to ? (
                      <>
                        {format(period.from, "LLL dd, y")} -{" "}
                        {format(period.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(period.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={period?.from}
                  selected={period}
                  onSelect={setPeriod}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
    );

    const MetricCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(value)}</div>
            </CardContent>
        </Card>
    );
    
    const ComparisonCard = ({ title, oldValue, newValue, diff, perc }: { title: string, oldValue: number, newValue: number, diff: number, perc: number }) => {
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
                        <span className="text-sm text-muted-foreground">Period A</span>
                        <span className="font-mono">{formatCurrency(oldValue)}</span>
                    </div>
                     <div className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">Period B</span>
                        <span className="font-mono">{formatCurrency(newValue)}</span>
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
                        Select Periods to Compare
                    </CardTitle>
                    <CardDescription>
                        Choose two date ranges to compare financial metrics. The analysis is based on transactions with a 'Date Closed' within the selected periods.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                        <DateRangePicker period={periodA} setPeriod={setPeriodA} label="Period A" />
                        <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                        <DateRangePicker period={periodB} setPeriod={setPeriodB} label="Period B" />
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
            ) : !periodB ? (
                 <Card className="mt-8 flex flex-col items-center justify-center p-12 text-center border-dashed">
                     <h3 className="text-xl font-semibold font-headline text-foreground">Select Period B</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Please select a second date range to see the comparison.
                    </p>
                 </Card>
            ) : (
                <div className="mt-8">
                    <h2 className="text-2xl font-bold font-headline mb-4">Comparison Results</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ComparisonCard title="Receivables" oldValue={metricsA.receivables} newValue={metricsB.receivables} diff={comparison.diffReceivables} perc={comparison.percReceivables} />
                        <ComparisonCard title="Payables" oldValue={metricsA.payables} newValue={metricsB.payables} diff={comparison.diffPayables} perc={comparison.percPayables} />
                        <ComparisonCard title="Net Position" oldValue={metricsA.net} newValue={metricsB.net} diff={comparison.diffNet} perc={comparison.percNet} />
                    </div>
                </div>
            )}
        </main>
      </SidebarInset>
    </>
  );
}

