
"use client";

import { useContext, useMemo, useState, useEffect } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpDown, Database, Trash2, Settings, LayoutDashboard, GanttChartSquare, BookOpen, CheckCircle, XCircle, Search, FileSpreadsheet, Repeat, CalendarDays, Download } from "lucide-react";
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
import { SidebarInset } from '@/components/ui/sidebar';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader } from "@/components/file-uploader";
import { AppSidebar } from "@/components/app-sidebar";


const INCLUDED_STATUSES = ['Open', 'Pending Approval', 'Unpaid'];
const INFLOW_TYPES: (CashFlowItem['Type'])[] = ['Invoice', 'Credit Memo'];
const OUTFLOW_TYPES: (CashFlowItem['Type'])[] = ['Bill', 'Bill Credit'];
const ROWS_PER_PAGE = 50;

type SortKey = keyof CashFlowItem | 'Installment Number';

export default function DataPage() {
  const { data, setData, columnConfig } = useContext(SettingsContext);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'Due Date', direction: 'ascending' });
  const [isClient, setIsClient] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleDataUploaded = (newData: CashFlowItem[]) => {
    setData(newData);
  };

  const handleClearData = () => {
    setData(null);
    toast({
      title: "Data Cleared",
      description: "Your imported data has been removed.",
    });
    setIsAlertOpen(false);
  };
  
  const uniqueTypes = useMemo(() => {
    if (!data) return [];
    const types = Array.from(new Set(data.map(item => item.Type).filter(Boolean)));
    return ['all', ...types];
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    if (!data) return [];
    const statuses = Array.from(new Set(data.map(item => item.Status).filter(Boolean)));
    return ['all', ...statuses];
  }, [data]);
  
  const filteredData = useMemo(() => {
    if (!isClient || !data) return [];
    setCurrentPage(1); // Reset to first page on filter change
    
    return data.filter(item => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (item.Name && item.Name.toLowerCase().includes(searchTermLower)) ||
        (item['Document Number'] && String(item['Document Number']).toLowerCase().includes(searchTermLower));
        
      const matchesType = typeFilter === 'all' || item.Type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.Status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
    
  }, [data, isClient, searchTerm, typeFilter, statusFilter]);

  const sortedData = useMemo(() => {
    if (!filteredData) return [];
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof CashFlowItem];
        const valB = b[sortConfig.key as keyof CashFlowItem];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / ROWS_PER_PAGE);
  }, [sortedData]);


  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
    }).format(amount);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    return format(date, 'dd/MM/yyyy');
  }
  
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

  const getTypeClassName = (type: CashFlowItem['Type']) => {
    if (INFLOW_TYPES.includes(type)) {
      return 'bg-primary/20 text-primary';
    }
    if (OUTFLOW_TYPES.includes(type)) {
      return 'bg-destructive/20 text-destructive';
    }
    return 'bg-muted text-muted-foreground';
  };


  return (
    <>
      <AppSidebar activePage="data" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                
                <h1 className="text-3xl font-bold font-headline text-foreground">Imported Data</h1>
              </div>
              <div className="flex items-center gap-2">
                {isClient && data && (
                    <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Data
                    </Button>
                )}
              </div>
          </div>
          
          {isClient && !data ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6" />
                  Upload Your Cash Flow Data
                </CardTitle>
                <CardDescription>
                  Upload an Excel file (.xlsx, .xls, .csv), or a previously exported session file (.json).
                  The 'Type' column should contain 'Invoice', 'Bill', 'Bill Credit', or 'Credit Memo'.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader onDataUploaded={handleDataUploaded} columnConfig={columnConfig} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Database className="w-6 h-6" />
                  All Imported Transactions
                </CardTitle>
                <CardDescription>
                  This table displays all raw data imported from your file. Only items with a status of 'Open', 'Unpaid', or 'Pending Approval' are included in the forecast.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-card">
                  <div className="sm:col-span-1">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                         placeholder="Search name or doc #"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="pl-10"
                       />
                     </div>
                  </div>
                  <div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueTypes.map(type => (
                          <SelectItem key={type} value={type || `_empty_${type}`}>{type === 'all' ? 'All Types' : type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                         {uniqueStatuses.map(status => (
                          <SelectItem key={status} value={status || `_empty_${status}`}>{status === 'all' ? 'All Statuses' : status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <SortableHeader sortKey="Type">Type</SortableHeader>
                        <SortableHeader sortKey="Document Number">Document #</SortableHeader>
                        <SortableHeader sortKey="Installment Number">Installment #</SortableHeader>
                        <SortableHeader sortKey="Name">Name</SortableHeader>
                        <SortableHeader sortKey="Due Date">Due Date</SortableHeader>
                        <SortableHeader sortKey="Date">Date</SortableHeader>
                        <SortableHeader sortKey="Date Closed">Date Closed</SortableHeader>
                        <SortableHeader sortKey="Amount">Amount</SortableHeader>
                        <SortableHeader sortKey="RemainingAmount">Remaining Amt</SortableHeader>
                        <SortableHeader sortKey="Status">Status</SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isClient && paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => {
                          const isIncluded = item.Status && INCLUDED_STATUSES.includes(item.Status);
                          return (
                            <TableRow key={index} className={!isIncluded ? 'bg-muted/50' : ''}>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeClassName(item.Type)}`}>
                                  {item.Type}
                                </span>
                              </TableCell>
                              <TableCell>{item['Document Number']}</TableCell>
                              <TableCell>{item['Installment Number']}</TableCell>
                              <TableCell>{item.Name}</TableCell>
                              <TableCell>{formatDate(item['Due Date'])}</TableCell>
                              <TableCell>{formatDate(item.Date)}</TableCell>
                              <TableCell>{formatDate(item['Date Closed'])}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(item.RemainingAmount)}</TableCell>
                              <TableCell>
                                 <div className="flex items-center gap-2">
                                  {isIncluded ? (
                                    <CheckCircle className="w-4 h-4 text-primary" />
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
                          <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                            {isClient ? (data ? "No results match your filters." : "No data has been imported yet.") : "Loading data..."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                 <div className="flex items-center justify-end space-x-2 py-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
