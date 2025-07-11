
"use client";

import { useMemo, useEffect, useState } from 'react';
import type { CashFlowItem, WeeklySummary, WeeklyDetails } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addWeeks, startOfWeek, isWithinInterval, endOfWeek, format, parse } from 'date-fns';
import { ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryTableProps {
  data: CashFlowItem[];
  onWeekSelect: (weekData: WeeklyDetails) => void;
}

export function SummaryTable({ data, onWeekSelect }: SummaryTableProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const summaryData = useMemo((): WeeklySummary[] => {
    if (!isClient) return [];
    const today = new Date();
    const weeklySummaries: WeeklySummary[] = [];

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekItems = data.filter(item => {
            const dueDate = new Date(item['Due Date']);
            return isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
        });

        const invoices = weekItems
            .filter(item => item.Type === 'Invoice')
            .reduce((sum, item) => sum + item.Amount, 0);
        
        const bills = weekItems
            .filter(item => item.Type === 'Bill')
            .reduce((sum, item) => sum + item.Amount, 0);

        weeklySummaries.push({
            week: `w/c ${format(weekStart, 'dd/MM')}`,
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            invoices,
            bills,
            details: weekItems,
        });
    }

    return weeklySummaries;
  }, [data, isClient]);

  const handleRowClick = (week: WeeklySummary) => {
    const weekStartStr = week.week.replace('w/c ', '');
    // We need to provide a reference date to parse, year is important for correctness
    const currentYear = new Date().getFullYear();
    const weekStart = parse(`${weekStartStr}/${currentYear}`, 'dd/MM/yyyy', new Date());

    const weekDetails: WeeklyDetails = {
        week: week.week,
        weekLabel: `Week commencing ${format(weekStart, 'do MMMM yyyy')}`,
        invoicesDue: week.invoices,
        billsDue: week.bills,
        details: week.details,
    };
    onWeekSelect(weekDetails);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <ListTodo className="w-6 h-6" />
          Weekly Summary
        </CardTitle>
        <CardDescription>Total invoices and bills for the next 12 weeks. Click a row for details.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Bills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No data for the next 12 weeks.
                    </TableCell>
                </TableRow>
              )}
              {summaryData.map((week) => (
                <TableRow key={week.week} onClick={() => handleRowClick(week)} className="cursor-pointer">
                  <TableCell className="font-medium">{week.weekLabel}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(week.invoices)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{formatCurrency(week.bills)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
