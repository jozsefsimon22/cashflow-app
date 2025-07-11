"use client";

import { useMemo, useEffect, useState } from 'react';
import type { CashFlowItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { addWeeks, format, startOfWeek, isWithinInterval, endOfWeek, getWeek } from 'date-fns';
import { BarChart as BarChartIcon } from 'lucide-react';

interface InvoiceChartProps {
  data: CashFlowItem[];
}

export function InvoiceChart({ data }: InvoiceChartProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = useMemo(() => {
    if (!isClient) return [];
    const today = new Date();
    const weeklyData: { week: string; weekLabel: string, receivables: number; invoices: { doc: string, name: string, amount: number }[] }[] = [];

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekReceivables = data
            .filter(item => {
                if (item.Type !== 'Receivable') return false;
                const dueDate = new Date(item['Due Date']);
                return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
            });

        const totalReceivables = weekReceivables.reduce((sum, item) => sum + item.Amount, 0);
        const invoiceDetails = weekReceivables.map(item => ({
            doc: String(item['Document Number']),
            name: item.Name,
            amount: item.Amount,
        }));

        weeklyData.push({
            week: `W${getWeek(weekStart, { weekStartsOn: 1 })}`,
            weekLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
            receivables: totalReceivables,
            invoices: invoiceDetails,
        });
    }

    return weeklyData;
  }, [data, isClient]);

  const chartConfig = {
    receivables: {
      label: "Unpaid Invoices",
      color: "hsl(var(--primary))",
    },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const weekData = payload[0].payload;
        return (
            <div className="p-3 bg-card border rounded-md shadow-lg max-w-sm">
                <p className="font-bold font-headline text-lg">{`${label}`}</p>
                <p className="text-sm text-muted-foreground mb-2">{weekData.weekLabel}</p>
                <p className="text-primary font-semibold">{`Total Due: $${weekData.receivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
                {weekData.invoices.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <p className="font-semibold text-sm mb-1">Invoices:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground max-h-40 overflow-y-auto pr-2">
                            {weekData.invoices.map((inv, index) => (
                                <li key={index} className="flex justify-between items-center">
                                    <span className="truncate" title={`${inv.doc}: ${inv.name}`}>{inv.doc}: {inv.name}</span>
                                    <span className="font-mono text-foreground ml-2 whitespace-nowrap">${inv.amount.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <BarChartIcon className="w-6 h-6" />
            Unpaid Invoices Over Next 12 Weeks
        </CardTitle>
        <CardDescription>Total amount of receivables due each week.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickFormatter={(value) => `$${Number(value) / 1000}k`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
              <Bar dataKey="receivables" fill="var(--color-receivables)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
