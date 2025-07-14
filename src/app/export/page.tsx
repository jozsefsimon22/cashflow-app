
"use client";

import { useContext, useState, useMemo } from "react";
import * as XLSX from 'xlsx';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { calculateWeeklyBreakdown } from "@/lib/forecast-engine";

export default function ExportPage() {
  const { 
    data, 
    manualTransactions, 
    excludedNames, 
    startingBalance, 
    columnConfig, 
    paidManualOccurrences, 
    intercompanyNames 
  } = useContext(SettingsContext);
  const { toast } = useToast();
  const [applyExclusions, setApplyExclusions] = useState(true);

  const weeklyBreakdown = useMemo(() => {
    return calculateWeeklyBreakdown({
      data,
      manualTransactions,
      paidManualOccurrences,
      startingBalance,
      excludedNames,
      intercompanyNames,
      applyExclusions,
    });
  }, [data, manualTransactions, paidManualOccurrences, startingBalance, excludedNames, intercompanyNames, applyExclusions]);

  const handleExcelExport = () => {
    try {
      if (weeklyBreakdown.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data to Export",
          description: "There is no forecast data to export.",
        });
        return;
      }
      
      const breakdownRows = weeklyBreakdown.map(week => ({
        Interval: week.weekLabel,
        AR: week.totalInflow,
        AP: week.totalOutflow,
        Difference: week.netFlow,
        'Accumulated liquidity': week.runningBalance
      }));

      const header = ["Interval", "AR", "AP", "Difference", "Accumulated liquidity"];
      const startingBalanceRow = {
          Interval: 'Starting Balance',
          'Accumulated liquidity': startingBalance
      };

      const exportData = [
        header.reduce((obj, key) => ({ ...obj, [key]: key }), {}),
        startingBalanceRow,
        ...breakdownRows
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(exportData, {
        header: header,
        skipHeader: true,
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cashflow Forecast");

      XLSX.writeFile(workbook, "CashflowJS_Forecast.xlsx");

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
        intercompanyNames,
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
      link.download = `cashflowjs_session_${date}.json`;
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
      <AppSidebar activePage="export" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold font-headline text-foreground">Export Data</h1>
            </div>
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
