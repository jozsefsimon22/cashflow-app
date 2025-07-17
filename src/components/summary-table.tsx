
"use client";

import { useContext } from 'react';
import type { WeeklyDetails, WeeklyBreakdown } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListTodo } from 'lucide-react';
import { SettingsContext } from '@/context/settings-context';


interface SummaryTableProps {
  data: WeeklyBreakdown[];
  onWeekSelect: (weekData: WeeklyDetails) => void;
}

export function SummaryTable({ data: summaryData, onWeekSelect }: SummaryTableProps) {
  const { columnConfig } = useContext(SettingsContext);
  
  const handleRowClick = (week: WeeklyBreakdown) => {
    let weekLabel;
    if (week.weekLabel === 'Overdue') {
        weekLabel = 'Overdue Transactions';
    } else {
        weekLabel = week.weekLabel.replace('w/c', 'Week commencing');
    }

    const allItems = [...week.arItems, ...week.apItems, ...week.intercompanyArItems, ...week.intercompanyApItems, ...week.manualInflows, ...week.manualOutflows];

    const weekDetails: WeeklyDetails = {
        week: week.weekLabel,
        weekLabel: weekLabel,
        invoicesDue: week.totalInflow,
        billsDue: week.totalOutflow,
        details: allItems,
    };
    onWeekSelect(weekDetails);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
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
                <TableRow key={week.weekLabel} onClick={() => handleRowClick(week)} className="cursor-pointer">
                  <TableCell className="font-medium">{week.weekLabel}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(week.totalInflow)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{formatCurrency(week.totalOutflow)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(week.runningBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
