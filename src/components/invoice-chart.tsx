
"use client";

import { useMemo, useEffect, useState } from 'react';
import type { CashFlowItem, WeeklyDetails } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { addWeeks, format, startOfWeek, isWithinInterval, endOfWeek, getWeek } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';


interface InvoiceChartProps {
  data: CashFlowItem[];
  onWeekSelect: (weekData: WeeklyDetails) => void;
}

export function InvoiceChart({ data, onWeekSelect }: InvoiceChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = useMemo(() => {
    if (!isClient) return [];
    const today = new Date();
    const weeklyData: WeeklyDetails[] = [];

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekItems = data
            .filter(item => {
                const dueDate = new Date(item['Due Date']);
                return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
            });

        const totalInvoices = weekItems.filter(item => item.Type === 'Invoice').reduce((sum, item) => sum + item.Amount, 0);
        const totalBills = weekItems.filter(item => item.Type === 'Bill').reduce((sum, item) => sum + item.Amount, 0);
        
        weeklyData.push({
            week: `W${getWeek(weekStart, { weekStartsOn: 1 })}`,
            weekLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
            invoicesDue: totalInvoices,
            billsDue: totalBills,
            details: weekItems,
        });
    }

    return weeklyData;
  }, [data, isClient]);

  const chartConfig = {
    invoicesDue: {
      label: "Invoices",
      color: "hsl(var(--primary))",
    },
    billsDue: {
      label: "Bills",
      color: "hsl(var(--destructive))",
    },
  };
  
  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const weekData = data.activePayload[0].payload;
      onWeekSelect(weekData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const weekData = payload[0].payload;
        return (
            <div className="p-3 bg-card border rounded-md shadow-lg max-w-sm">
                <p className="font-bold font-headline text-lg">{`${label}`}</p>
                <p className="text-sm text-muted-foreground mb-2">{weekData.weekLabel}</p>
                 <div className="space-y-1">
                    <p className="flex justify-between">
                        <span className="text-primary font-semibold">Invoices:</span>
                        <span className="font-mono">{formatCurrency(weekData.invoicesDue)}</span>
                    </p>
                    <p className="flex justify-between">
                        <span className="text-destructive font-semibold">Bills:</span>
                        <span className="font-mono">{formatCurrency(weekData.billsDue)}</span>
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
              <BarChartIcon className="w-6 h-6" />
              Cash Flow Over Next 12 Weeks
          </CardTitle>
          <CardDescription>Weekly invoices vs. bills. Click a bar for details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} onClick={handleBarClick} className="cursor-pointer">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis
                  tickFormatter={(value) => `$${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                <Bar dataKey="invoicesDue" stackId="a" fill="var(--color-invoicesDue)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="billsDue" stackId="a" fill="var(--color-billsDue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
