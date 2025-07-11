
"use client";

import { useContext, useState } from "react";
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupLabel, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Settings, BookOpen, GanttChartSquare, Repeat, XCircle, CalendarDays, Download } from 'lucide-react';
import type { CashFlowItem, ManualTransaction } from '@/types';
import { format, addWeeks, addMonths, addQuarters, startOfToday, isBefore, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const INCLUDED_STATUSES = ['Open', 'Pending Approval', 'Unpaid'];
const INFLOW_TYPES = ['Invoice', 'Bill Credit'];
const OUTFLOW_TYPES = ['Bill', 'Credit Memo'];

const generateForecastItems = (manualTransactions: ManualTransaction[], forecastEndDate: Date): (ManualTransaction & { dueDate: Date })[] => {
  const items: (ManualTransaction & { dueDate: Date })[] = [];
  
  manualTransactions.forEach(t => {
    let currentDate = t.startDate;
    let i = 0;
    while (currentDate <= forecastEndDate && i < 1000) {
      items.push({ ...t, dueDate: currentDate });
      if (t.frequency === 'once') break;
      switch (t.frequency) {
        case 'weekly': currentDate = addWeeks(currentDate, 1); break;
        case 'fortnightly': currentDate = addWeeks(currentDate, 2); break;
        case 'monthly': currentDate = addMonths(currentDate, 1); break;
        case 'quarterly': currentDate = addQuarters(currentDate, 1); break;
      }
      i++;
    }
  });
  return items;
};

export default function ExportPage() {
  const { data, manualTransactions, excludedNames, startingBalance, columnConfig, paidManualOccurrences } = useContext(SettingsContext);
  const { toast } = useToast();
  const [applyExclusions, setApplyExclusions] = useState(true);

  const handleExcelExport = () => {
    try {
      // --- 1. Calculate Data (similar to Weekly View) ---
      const excludedNamesSet = new Set(excludedNames);
      const today = startOfToday();

      const fileData = data ? data.filter(item => 
        item.Status && 
        INCLUDED_STATUSES.includes(item.Status) &&
        (!applyExclusions || !excludedNamesSet.has(item.Name))
      ) : [];

      const forecastEndDate = addWeeks(today, 13);
      const allManualData = generateForecastItems(manualTransactions, forecastEndDate)
          .filter(item => (!applyExclusions || !excludedNamesSet.has(item.name)));

      const breakdownRows = [];
      let currentBalance = startingBalance;
      
      const overdueFileData = fileData.filter(item => item['Due Date'] && isBefore(item['Due Date'], today));
      const overdueManualData = allManualData.filter(item => isBefore(item.dueDate, today));
      
      const overdueAR = overdueFileData.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0) + overdueManualData.filter(t => t.type === 'inflow').reduce((sum, item) => sum + item.amount, 0);
      const overdueAP = overdueFileData.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0) + overdueManualData.filter(t => t.type === 'outflow').reduce((sum, item) => sum + item.amount, 0);

      const overdueNetFlow = overdueAR - overdueAP;
      currentBalance += overdueNetFlow;

      breakdownRows.push({
        Interval: 'Overdue',
        AR: overdueAR,
        AP: overdueAP,
        Difference: overdueNetFlow,
        'Accumulated liquidity': currentBalance
      });
      
      const futureFileData = fileData.filter(item => item['Due Date'] && !isBefore(item['Due Date'], today));
      const futureManualData = allManualData.filter(item => !isBefore(item.dueDate, today));

      for (let i = 0; i < 12; i++) {
          const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
          const weekFileData = futureFileData.filter(item => item['Due Date'] && isWithinInterval(item['Due Date'], { start: weekStart, end: weekEnd }));
          const weekManualData = futureManualData.filter(item => isWithinInterval(item.dueDate, { start: weekStart, end: weekEnd }));
          const weeklyAR = weekFileData.filter(item => INFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0) + weekManualData.filter(t => t.type === 'inflow').reduce((sum, item) => sum + item.amount, 0);
          const weeklyAP = weekFileData.filter(item => OUTFLOW_TYPES.includes(item.Type)).reduce((sum, item) => sum + item.RemainingAmount, 0) + weekManualData.filter(t => t.type === 'outflow').reduce((sum, item) => sum + item.amount, 0);

          const netFlow = weeklyAR - weeklyAP;
          currentBalance += netFlow;

          breakdownRows.push({
              Interval: `${format(weekStart, 'ddMMyy')} - ${format(weekEnd, 'ddMMyy')}`,
              AR: weeklyAR,
              AP: weeklyAP,
              Difference: netFlow,
              'Accumulated liquidity': currentBalance,
          });
      }

      // --- 2. Format for Excel ---
      const header = ["Interval", "AR", "AP", "Difference", "Accumulated liquidity"];
      const startingBalanceRow = {
          Interval: 'Starting Balance',
          'Accumulated liquidity': startingBalance
      };

      const exportData = [
        header.reduce((obj, key) => ({ ...obj, [key]: key }), {}), // Use header for first row of data
        startingBalanceRow,
        ...breakdownRows
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: header,
        skipHeader: true, // We are creating our own header row
      });

      // --- 3. Create and Download File ---
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cashflow Forecast");

      XLSX.writeFile(workbook, "VizFlow_Cashflow_Forecast.xlsx");

      toast({
        title: "Export Successful",
        description: "Your cash flow forecast has been downloaded.",
      });

    } catch (error) {
       console.error("Export failed:", error);
       toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An unexpected error occurred while generating the file.",
      });
    }
  };

  const handleJsonExport = () => {
    try {
      const sessionData = {
        data,
        manualTransactions,
        excludedNames,
        startingBalance,
        columnConfig,
        paidManualOccurrences,
      };

      const jsonString = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = format(new Date(), 'yyyy-MM-dd');
      link.download = `vizflow_session_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Session Exported",
        description: "Your session data has been downloaded as a JSON file.",
      });

    } catch (error) {
      console.error("JSON Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An unexpected error occurred while generating the JSON file.",
      });
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold font-headline text-foreground">VizFlow</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarGroupLabel>Analysis</SidebarGroupLabel>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/weekly-view">
                  <CalendarDays />
                  <span>Weekly View</span>
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

            <SidebarGroupLabel>Data Management</SidebarGroupLabel>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/manual-transactions">
                  <Repeat />
                  <span>Manual Transactions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/exclusions">
                  <XCircle />
                  <span>Exclusions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href="/export">
                  <Download />
                  <span>Export</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarGroupLabel>Support</SidebarGroupLabel>
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
            <h1 className="text-3xl font-bold font-headline text-foreground">Export Data</h1>
            <SidebarTrigger />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Download className="w-6 h-6" />
                  Download Forecast
                </CardTitle>
                <CardDescription>
                  Export the 12-week cash flow forecast summary to an Excel file (.xlsx). The export will use your current data, including manual transactions and exclusions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Switch 
                    id="exclusions-toggle" 
                    checked={applyExclusions} 
                    onCheckedChange={setApplyExclusions} 
                  />
                  <Label htmlFor="exclusions-toggle">Apply Name Exclusions</Label>
                </div>
                <div className="flex justify-start">
                   <Button onClick={handleExcelExport} disabled={!data && manualTransactions.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Export to Excel
                  </Button>
                </div>
                 {(!data && manualTransactions.length === 0) && (
                   <p className="text-sm text-muted-foreground mt-4">
                      Please import data or add manual transactions before exporting.
                  </p>
                 )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Download className="w-6 h-6" />
                  Download Session
                </CardTitle>
                <CardDescription>
                  Export the entire application state to a JSON file. This file can be shared and imported by another user to replicate your current session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-start">
                   <Button onClick={handleJsonExport} variant="secondary">
                      <Download className="w-4 h-4 mr-2" />
                      Export to JSON
                  </Button>
                </div>
                 {(!data && manualTransactions.length === 0) && (
                   <p className="text-sm text-muted-foreground mt-4">
                      No data to export.
                  </p>
                 )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
