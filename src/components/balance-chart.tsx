
"use client";

import { useMemo, useEffect, useState, useContext } from 'react';
import type { CashFlowItem, WeeklyDetails } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { addWeeks, format, startOfWeek, endOfWeek } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { SettingsContext } from '@/context/settings-context';


interface BalanceChartProps {
  data: CashFlowItem[];
  onWeekSelect: (weekData: WeeklyDetails) => void;
}

const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

export function BalanceChart({ data, onWeekSelect }: BalanceChartProps) {
  const [isClient, setIsClient] = useState(false);
  const { startingBalance } = useContext(SettingsContext);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = useMemo(() => {
    if (!isClient) return [];
    const today = new Date();
    const weeklyData: (WeeklyDetails & { balance: number })[] = [];
    let runningBalance = startingBalance;

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekItems = data
            .filter(item => {
                const dueDate = item['Due Date'];
                // Reset time to midnight for consistent comparison
                if (!dueDate) return false;
                const comparisonDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                return comparisonDate >= weekStart && comparisonDate <= weekEnd;
            });

        const totalInvoices = weekItems.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0);
        const totalBills = weekItems.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0);
        
        runningBalance += totalInvoices - totalBills;

        weeklyData.push({
            week: `w/c ${format(weekStart, 'dd/MM')}`,
            weekLabel: `Week commencing ${format(weekStart, 'do MMMM yyyy')}`,
            invoicesDue: totalInvoices,
            billsDue: totalBills,
            balance: runningBalance,
            details: weekItems,
        });
    }

    return weeklyData;
  }, [data, isClient, startingBalance]);

  const chartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--primary))",
    },
     invoicesDue: {
      label: "Inflow",
      color: "hsl(var(--primary))",
    },
    billsDue: {
      label: "Outflow",
      color: "hsl(var(--destructive))",
    },
  };
  
  const handlePointClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const weekData = data.activePayload[0].payload;
      onWeekSelect(weekData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };
  
  const formatYAxis = (amount: number) => {
    if (Math.abs(amount) >= 1000) {
      return `£${amount / 1000}k`;
    }
    return `£${amount}`;
  }


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const weekData = payload[0].payload;
        return (
            <div className="p-3 bg-card border rounded-md shadow-lg max-w-sm">
                <p className="font-bold font-headline text-lg">{`${label}`}</p>
                <p className="text-sm text-muted-foreground mb-2">{weekData.weekLabel}</p>
                 <div className="space-y-1">
                    <p className="flex justify-between font-bold text-lg">
                        <span className="text-foreground">Ending Balance:</span>
                        <span className="font-mono">{formatCurrency(weekData.balance)}</span>
                    </p>
                    <hr className="my-2 border-border" />
                    <p className="flex justify-between">
                        <span className="text-primary font-semibold">Weekly Inflow:</span>
                        <span className="font-mono text-primary">{formatCurrency(weekData.invoicesDue)}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-destructive font-semibold">Weekly Outflow:</span>
                        <span className="font-mono text-destructive">{formatCurrency(weekData.billsDue)}</span>
                    </p>
                 </div>
            </div>
        );
    }
    return null;
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Cash Flow Balance Over Next 12 Weeks
          </CardTitle>
          <CardDescription>Projected running balance, starting from your provided bank balance. Click a data point for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} onClick={handlePointClick} className="cursor-pointer">
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis
                  tickFormatter={(value) => formatYAxis(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
