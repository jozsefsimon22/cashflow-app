
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, WeeklyDetails } from '@/types';
import { FileUploader } from '@/components/file-uploader';
import { InvoiceChart } from '@/components/invoice-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Settings, Database, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
  
  const weeklyDetails = useMemo(() => {
    if (!selectedWeek?.details) return { inflow: [], outflow: [] };
    const inflow = selectedWeek.details.filter(item => item.Type === 'Invoice');
    const outflow = selectedWeek.details.filter(item => item.Type === 'Bill');
    return { inflow, outflow };
  }, [selectedWeek]);

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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Details for {selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              A breakdown of all incoming and outgoing transactions for this week.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Inflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <ArrowUpCircle className="w-6 h-6" />
                <span>Inflow (Invoices)</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(selectedWeek?.invoicesDue || 0)}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyDetails.inflow.length > 0 ? (
                    weeklyDetails.inflow.map((item, index) => (
                      <TableRow key={`inflow-${index}`}>
                        <TableCell>{item.Name}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No invoices this week.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Outflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-destructive">
                <ArrowDownCircle className="w-6 h-6" />
                <span>Outflow (Bills)</span>
              </div>
              <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(selectedWeek?.billsDue || 0)}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyDetails.outflow.length > 0 ? (
                    weeklyDetails.outflow.map((item, index) => (
                      <TableRow key={`outflow-${index}`}>
                        <TableCell>{item.Name}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No bills this week.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
