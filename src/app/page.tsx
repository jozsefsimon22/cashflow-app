
"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import type { CashFlowItem, WeeklyDetails } from '@/types';
import { FileUploader } from '@/components/file-uploader';
import { BalanceChart } from '@/components/balance-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Settings, Database, ArrowUpCircle, ArrowDownCircle, LayoutDashboard, GanttChartSquare, Wallet, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';

const INCLUDED_STATUSES = ['Open', 'Pending Approval'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];


type GroupedItems = {
  [name: string]: {
    total: number;
    items: CashFlowItem[];
  };
};

export default function Home() {
  const { data, setData, columnConfig } = useContext(SettingsContext);
  const [isClient, setIsClient] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyDetails | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const forecastData = useMemo(() => {
    if (!data) return null;
    return data.filter(item => INCLUDED_STATUSES.includes(item.Status));
  }, [data]);


  const handleDataUploaded = (newData: CashFlowItem[]) => {
    setData(newData);
  };
  
  const handleWeekSelect = (weekData: WeeklyDetails) => {
    setSelectedWeek(weekData);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };
  
  const summaryMetrics = useMemo(() => {
    if (!forecastData) return { totalReceivables: 0, totalPayables: 0, currentBalance: 0 };
    const totalReceivables = forecastData.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.Amount, 0);
    const totalPayables = forecastData.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.Amount, 0);
    const currentBalance = totalReceivables - totalPayables;
    return { totalReceivables, totalPayables, currentBalance };
  }, [forecastData]);

  const weeklyDetails = useMemo(() => {
    if (!selectedWeek?.details) return { inflow: {}, outflow: {} };

    const groupItems = (items: CashFlowItem[]): GroupedItems => {
      return items.reduce((acc: GroupedItems, item) => {
        if (!acc[item.Name]) {
          acc[item.Name] = { total: 0, items: [] };
        }
        acc[item.Name].total += item.Amount;
        acc[item.Name].items.push(item);
        return acc;
      }, {});
    };

    const inflowItems = selectedWeek.details.filter(item => INFLOW_TYPES.includes(item.Type));
    const outflowItems = selectedWeek.details.filter(item => OUTFLOW_TYPES.includes(item.Type));

    return {
      inflow: groupItems(inflowItems),
      outflow: groupItems(outflowItems),
    };
  }, [selectedWeek]);

  return (
    <>
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
                <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold font-headline text-foreground">TerraRoc Cashflow</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton asChild isActive>
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild>
              <Link href="/data">
                <Database />
                <span>Imported Data</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
             <SidebarMenuButton asChild>
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
             </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/documentation">
                <BookOpen />
                <span>Documentation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
            <SidebarTrigger />
        </div>
        <div className="space-y-8">
          {isClient && forecastData ? (
            <>
               <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Forecast Balance</CardTitle>
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.currentBalance)}</div>
                          <p className="text-xs text-muted-foreground">Based on 'Open' and 'Pending Approval' items</p>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalReceivables)}</div>
                           <p className="text-xs text-muted-foreground">From invoices in the forecast</p>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalPayables)}</div>
                           <p className="text-xs text-muted-foreground">From bills in the forecast</p>
                      </CardContent>
                  </Card>
              </div>
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <BalanceChart data={forecastData} onWeekSelect={handleWeekSelect} />
                </div>
                <div className="lg:col-span-1">
                  <SummaryTable data={forecastData} onWeekSelect={handleWeekSelect} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6" />
                    Upload Your Cash Flow Data
                  </CardTitle>
                  <CardDescription>
                    Upload an Excel file (.xlsx, .xls, .csv). Use the settings to map your columns if they don't match the defaults.
                    The 'Type' column should contain 'Invoice', 'Bill', 'Bill Credit', or 'Credit Memo'.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploader onDataUploaded={handleDataUploaded} columnConfig={columnConfig} />
                </CardContent>
              </Card>
               <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                <div className="bg-secondary p-4 rounded-full mb-4">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
                <p className="text-muted-foreground mt-1">Upload your file to see your cash flow analysis.</p>
              </Card>
            </>
          )}
        </div>
      </main>
    </SidebarInset>
    <Dialog open={!!selectedWeek} onOpenChange={() => setSelectedWeek(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Details for {selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              A breakdown of incoming and outgoing transactions for this week, grouped by name.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            
            {/* Inflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <ArrowUpCircle className="w-6 h-6" />
                <span>Inflow</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(selectedWeek?.invoicesDue || 0)}</p>
              <Accordion type="single" collapsible className="w-full">
                {Object.keys(weeklyDetails.inflow).length > 0 ? (
                  Object.entries(weeklyDetails.inflow).map(([name, group]) => (
                    <AccordionItem value={name} key={`inflow-${name}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{name}</span>
                          <span className="font-mono text-primary">{formatCurrency(group.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Document #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`in-detail-${index}`}>
                                <TableCell>{item['Document Number']}</TableCell>
                                <TableCell>{item.Type}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No inflow this week.</p>
                )}
              </Accordion>
            </div>

            {/* Outflow Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-bold text-destructive">
                <ArrowDownCircle className="w-6 h-6" />
                <span>Outflow</span>
              </div>
              <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(selectedWeek?.billsDue || 0)}</p>
              <Accordion type="single" collapsible className="w-full">
                {Object.keys(weeklyDetails.outflow).length > 0 ? (
                  Object.entries(weeklyDetails.outflow).map(([name, group]) => (
                    <AccordionItem value={name} key={`outflow-${name}`}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{name}</span>
                          <span className="font-mono text-destructive">{formatCurrency(group.total)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Document #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item, index) => (
                              <TableRow key={`out-detail-${index}`}>
                                <TableCell>{item['Document Number']}</TableCell>
                                <TableCell>{item.Type}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No outflow this week.</p>
                )}
              </Accordion>
            </div>
            
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
