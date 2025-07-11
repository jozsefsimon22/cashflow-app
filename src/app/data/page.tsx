
"use client";

import { useContext, useMemo, useState, useEffect } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpDown, Database, Trash2, Settings, LayoutDashboard, GanttChartSquare, BookOpen, CheckCircle, XCircle } from "lucide-react";
import type { CashFlowItem } from "@/types";
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Badge } from "@/components/ui/badge";

const INCLUDED_STATUSES = ['Open', 'Pending Approval'];
type SortKey = keyof CashFlowItem;

export default function DataPage() {
  const { data, setData } = useContext(SettingsContext);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'Due Date', direction: 'ascending' });
  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClearData = () => {
    setData(null);
    toast({
      title: "Data Cleared",
      description: "Your imported data has been removed.",
    });
    setIsAlertOpen(false);
  };

  const sortedData = useMemo(() => {
    if (!isClient || !data) return [];
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, isClient]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };
  
  const SortableHeader = ({ sortKey, children }: { sortKey: SortKey, children: React.ReactNode }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <TableHead>
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
          {children}
          <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-foreground' : 'text-muted-foreground/50'}`} />
        </Button>
      </TableHead>
    );
  };


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
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
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
              <h1 className="text-3xl font-bold font-headline text-foreground">Imported Data</h1>
              <div className="flex items-center gap-2">
                {isClient && data && (
                    <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Data
                    </Button>
                )}
                <SidebarTrigger />
              </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Database className="w-6 h-6" />
                All Imported Transactions
              </CardTitle>
              <CardDescription>
                This table displays all raw data imported from your file. Only items with a status of 'Open' or 'Pending Approval' are included in the forecast.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <SortableHeader sortKey="Type">Type</SortableHeader>
                      <SortableHeader sortKey="Document Number">Document #</SortableHeader>
                      <SortableHeader sortKey="Name">Name</SortableHeader>
                      <SortableHeader sortKey="Due Date">Due Date</SortableHeader>
                      <SortableHeader sortKey="Amount">Amount</SortableHeader>
                      <SortableHeader sortKey="Status">Status</SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isClient && sortedData.length > 0 ? (
                      sortedData.map((item, index) => {
                        const isIncluded = INCLUDED_STATUSES.includes(item.Status);
                        return (
                          <TableRow key={index} className={!isIncluded ? 'bg-muted/50' : ''}>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.Type === 'Invoice' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                                {item.Type}
                              </span>
                            </TableCell>
                            <TableCell>{item['Document Number']}</TableCell>
                            <TableCell>{item.Name}</TableCell>
                            <TableCell>{format(item['Due Date'], 'yyyy-MM-dd')}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                            <TableCell>
                               <div className="flex items-center gap-2">
                                {isIncluded ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-muted-foreground" />
                                )}
                                <Badge variant={isIncluded ? 'outline' : 'secondary'} className="font-normal">
                                  {item.Status}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          {isClient ? "No data has been imported yet. Go to the dashboard to upload a file." : "Loading data..."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently clear the
              imported data from your session. You will need to upload the file again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData}>
              Yes, clear data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
