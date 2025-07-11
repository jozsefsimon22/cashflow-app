
"use client";

import { useContext, useEffect, useState } from 'react';
import type { CashFlowItem, WeeklyDetails } from '@/types';
import { FileUploader } from '@/components/file-uploader';
import { InvoiceChart } from '@/components/invoice-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Settings, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SettingsContext } from '@/context/settings-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

export default function Home() {
  const { data, setData, columnConfig } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyDetails | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleDataUploaded = (newData: CashFlowItem[]) => {
    setData(newData);
  };
  
  const handleWeekSelect = (weekData: WeeklyDetails) => {
    setSelectedWeek(weekData);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <>
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">VizFlow</h1>
            <p className="mt-2 text-lg text-muted-foreground">Your cash flow, visualized.</p>
          </div>
          <div className="flex items-center gap-2">
            {isClient && data && (
              <Button variant="outline" asChild>
                <Link href="/data">
                  <Database className="w-4 h-4 mr-2" />
                  View Data
                </Link>
              </Button>
            )}
             <Button variant="ghost" size="icon" asChild>
                <Link href="/settings">
                    <Settings className="w-6 h-6" />
                    <span className="sr-only">Open Settings</span>
                </Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6" />
              Upload Your Cash Flow Data
            </CardTitle>
            <CardDescription>
              Upload an Excel file (.xlsx, .xls, .csv). Use the settings to map your columns if they don't match the defaults.
              The 'Type' column should contain 'Invoice' (for incoming cash) or 'Bill' (for outgoing cash).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onDataUploaded={handleDataUploaded} columnConfig={columnConfig} />
          </CardContent>
        </Card>

        {isClient && data ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <InvoiceChart data={data} onWeekSelect={handleWeekSelect} />
            </div>
            <div className="lg:col-span-1">
              <SummaryTable data={data} onWeekSelect={handleWeekSelect} />
            </div>
          </div>
        ) : (
           <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
            <p className="text-muted-foreground mt-1">Upload your file to see your cash flow analysis.</p>
          </Card>
        )}
      </div>
    </main>
    <Dialog open={!!selectedWeek} onOpenChange={() => setSelectedWeek(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Details for {selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              All incoming and outgoing transactions for this week.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Document #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedWeek?.details && selectedWeek.details.length > 0 ? (
                        selectedWeek.details
                          .sort((a,b) => a.Type.localeCompare(b.Type))
                          .map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.Type === 'Invoice' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                      {item.Type}
                                    </span>
                                </TableCell>
                                <TableCell>{item['Document Number']}</TableCell>
                                <TableCell>{item.Name}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">No transactions this week.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
