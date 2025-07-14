
"use client";

import { useMemo, useEffect, useState, useContext } from 'react';
import type { CashFlowItem, WeeklySummary, WeeklyDetails } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addWeeks, startOfWeek, endOfWeek, format, startOfToday } from 'date-fns';
import { ListTodo } from 'lucide-react';
import { SettingsContext } from '@/context/settings-context';

interface SummaryTableProps {
  data: CashFlowItem[];
  onWeekSelect: (weekData: WeeklyDetails) => void;
}

export function SummaryTable({ data, onWeekSelect }: SummaryTableProps) {
  const [isClient, setIsClient] = useState(false);
  const { startingBalance } = useContext(SettingsContext);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const summaryData = useMemo((): WeeklySummary[] => {
    if (!isClient) return [];
    const today = startOfToday();
    const weeklySummaries: WeeklySummary[] = [];

    // Calculate overdue amounts first
    const overdueItems = data.filter(item => {
        const dueDate = item['Due Date'];
        return dueDate && dueDate < today;
    });

    const overdueInvoices = overdueItems
        .filter(item => item.Type === 'Invoice')
        .reduce((sum, item) => sum + item.RemainingAmount, 0);
    const overdueCreditMemos = overdueItems
        .filter(item => item.Type === 'Credit Memo')
        .reduce((sum, item) => sum + item.RemainingAmount, 0);
    
    const overdueBills = overdueItems
        .filter(item => item.Type === 'Bill')
        .reduce((sum, item) => sum + item.RemainingAmount, 0);
    const overdueBillCredits = overdueItems
        .filter(item => item.Type === 'Bill Credit')
        .reduce((sum, item) => sum + item.RemainingAmount, 0);
        
    const overdueInflow = overdueInvoices - overdueCreditMemos;
    const overdueOutflow = overdueBills - overdueBillCredits;

    let runningBalance = startingBalance + overdueInflow - overdueOutflow;
    
    // Add overdue row
    weeklySummaries.push({
        week: 'overdue',
        weekLabel: 'Overdue',
        weekStart: null,
        invoices: overdueInflow,
        bills: overdueOutflow,
        balance: runningBalance,
        details: overdueItems,
    });

    const futureData = data.filter(item => {
        const dueDate = item['Due Date'];
        return dueDate && dueDate >= today;
    });

    for (let i = 0; i < 12; i++) {
        const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });

        const weekItems = futureData.filter(item => {
            const dueDate = item['Due Date'];
            if (!dueDate) return false;
            const comparisonDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            return comparisonDate >= weekStart && comparisonDate <= weekEnd;
        });

        const weeklyInvoices = weekItems
            .filter(item => item.Type === 'Invoice')
            .reduce((sum, item) => sum + item.RemainingAmount, 0);
        const weeklyCreditMemos = weekItems
            .filter(item => item.Type === 'Credit Memo')
            .reduce((sum, item) => sum + item.RemainingAmount, 0);

        const weeklyBills = weekItems
            .filter(item => item.Type === 'Bill')
            .reduce((sum, item) => sum + item.RemainingAmount, 0);
        const weeklyBillCredits = weekItems
            .filter(item => item.Type === 'Bill Credit')
            .reduce((sum, item) => sum + item.RemainingAmount, 0);
        
        const invoices = weeklyInvoices - weeklyCreditMemos;
        const bills = weeklyBills - weeklyBillCredits;
        
        runningBalance += invoices - bills;

        weeklySummaries.push({
            week: `w/c ${format(weekStart, 'dd/MM')}`,
            weekLabel: `w/c ${format(weekStart, 'dd/MM')}`,
            weekStart,
            invoices,
            bills,
            balance: runningBalance,
            details: weekItems,
        });
    }

    return weeklySummaries;
  }, [data, isClient, startingBalance]);

  const handleRowClick = (week: WeeklySummary) => {
    let weekLabel;
    if (week.week === 'overdue') {
        weekLabel = 'Overdue Transactions';
    } else if (week.weekStart) {
        weekLabel = `Week commencing ${format(week.weekStart, 'do MMMM yyyy')}`;
    } else {
        weekLabel = 'Details';
    }

    const weekDetails: WeeklyDetails = {
        week: week.week,
        weekLabel: weekLabel,
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
        <CardDescription>Total inflow and outflow for the next 12 weeks, including overdue items. Click a row for details.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No data found.
                    </TableCell>
                </TableRow>
              )}
              {summaryData.map((week) => (
                <TableRow key={week.week} onClick={() => handleRowClick(week)} className="cursor-pointer">
                  <TableCell className="font-medium">{week.weekLabel}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(week.invoices)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{formatCurrency(week.bills)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(week.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
