
"use client";

import { useContext, useMemo, useState } from "react";
import { differenceInCalendarDays, format, subDays, startOfToday } from 'date-fns';
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Medal, ArrowUpDown, Info, Search, X } from "lucide-react";
import type { CustomerScore, CashFlowItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SortKey = keyof Omit<CustomerScore, 'invoices'>;
type SortDirection = 'asc' | 'desc';

export default function CustomerScorecardPage() {
  const { data, columnConfig } = useContext(SettingsContext);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'paymentScore', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerScore | null>(null);
  const [filterLastYear, setFilterLastYear] = useState(false);

  const customerScores = useMemo((): CustomerScore[] => {
    if (!data) return [];

    const oneYearAgo = subDays(startOfToday(), 365);
    
    let paidInvoices = data.filter(item => 
      item.Type === 'Invoice' &&
      item['Due Date'] &&
      item['Date Closed']
    );

    if (filterLastYear) {
      paidInvoices = paidInvoices.filter(item => item['Date Closed']! >= oneYearAgo);
    }

    const customerData: { [name: string]: { totalPaid: number; onTime: number; late: number; totalDaysLate: number; totalValue: number; invoices: CashFlowItem[] } } = {};

    paidInvoices.forEach(item => {
      const name = item.Name;
      if (!customerData[name]) {
        customerData[name] = { totalPaid: 0, onTime: 0, late: 0, totalDaysLate: 0, totalValue: 0, invoices: [] };
      }

      customerData[name].totalPaid++;
      customerData[name].totalValue += item.Amount;
      customerData[name].invoices.push(item);
      
      const daysLate = differenceInCalendarDays(item['Date Closed']!, item['Due Date']!);

      if (daysLate <= 0) {
        customerData[name].onTime++;
      } else {
        customerData[name].late++;
        customerData[name].totalDaysLate += daysLate;
      }
    });

    return Object.entries(customerData).map(([name, stats]) => {
      const avgDaysLate = stats.late > 0 ? Math.round(stats.totalDaysLate / stats.late) : 0;
      const onTimePercentage = (stats.onTime / stats.totalPaid) * 100;
      
      const latenessPenalty = Math.min(40, (avgDaysLate / 90) * 40);
      const paymentScore = Math.max(0, Math.round(onTimePercentage - latenessPenalty));

      return {
        name,
        ...stats,
        avgDaysLate,
        paymentScore,
      };
    });
  }, [data, filterLastYear]);
  
  const sortedScores = useMemo(() => {
    const filteredScores = customerScores.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filteredScores].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        return 0;
    });
  }, [customerScores, sortConfig, searchTerm]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortKey, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <TableHead className={className}>
        <Button variant="ghost" onClick={() => requestSort(sortKey)}>
          {children}
          <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-foreground' : 'text-muted-foreground/50'}`} />
        </Button>
      </TableHead>
    );
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 75) return "bg-yellow-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDateTableCell = (date: Date | null | undefined) => {
    if (!date) return '';
    return format(date, 'dd/MM/yyyy');
  }

  return (
    <>
      <AppSidebar activePage="customer-scorecard" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
           <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-headline text-foreground">Customer Scorecard</h1>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Medal className="w-6 h-6" />
                                Payment Behavior Analysis
                            </CardTitle>
                            <CardDescription>
                                Customers are scored based on their history of paying invoices on time. Click a customer's name to see their invoices.
                            </CardDescription>
                        </div>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"><Info className="w-4 h-4 text-muted-foreground" /></Button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p className="font-bold">How is the score calculated?</p>
                                    <p className="text-sm text-muted-foreground">The score starts with the customer's on-time payment percentage and then subtracts penalty points based on the average number of days their payments are late.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent>
                    {customerScores.length > 0 ? (
                        <>
                         <div className="mb-4 flex items-center justify-between">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by customer name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="last-year-toggle"
                                    checked={filterLastYear}
                                    onCheckedChange={setFilterLastYear}
                                />
                                <Label htmlFor="last-year-toggle">Only show activity in last 12 months</Label>
                            </div>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <SortableHeader sortKey="name">Customer Name</SortableHeader>
                                        <SortableHeader sortKey="paymentScore" className="w-[200px]">Payment Score</SortableHeader>
                                        <SortableHeader sortKey="totalPaid">Paid Invoices</SortableHeader>
                                        <SortableHeader sortKey="onTime">On Time</SortableHeader>
                                        <SortableHeader sortKey="late">Late</SortableHeader>
                                        <SortableHeader sortKey="avgDaysLate">Avg. Days Late</SortableHeader>
                                        <SortableHeader sortKey="totalValue">Total Value Paid</SortableHeader>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedScores.length > 0 ? sortedScores.map((customer) => (
                                    <TableRow key={customer.name}>
                                        <TableCell>
                                            <Button variant="link" className="p-0 h-auto font-medium" onClick={() => setSelectedCustomer(customer)}>
                                                {customer.name}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg w-10">{customer.paymentScore}</span>
                                                <Progress value={customer.paymentScore} className="h-2 flex-1" indicatorClassName={getScoreColor(customer.paymentScore)} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{customer.totalPaid}</TableCell>
                                        <TableCell className="text-center text-green-600 font-medium">{customer.onTime}</TableCell>
                                        <TableCell className="text-center text-red-600 font-medium">{customer.late}</TableCell>
                                        <TableCell className="text-center">{customer.avgDaysLate > 0 ? customer.avgDaysLate : '-'}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(customer.totalValue)}</TableCell>
                                    </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                No customers found matching "{searchTerm}".
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                             <div className="bg-secondary p-4 rounded-full mb-4">
                                <Medal className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold font-headline text-foreground">Not Enough Data</h3>
                            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                                No paid invoices with both a 'Due Date' and a 'Date Closed' were found in your data. Please import a file with this information on the <Link href="/data" className="text-primary underline font-medium">Imported Data</Link> page to generate the scorecard.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
      </SidebarInset>

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl">
            {selectedCustomer && (
                <>
                <DialogHeader>
                    <DialogTitle>Paid Invoice History for {selectedCustomer.name}</DialogTitle>
                    <DialogDescription>
                        A complete list of paid invoices used to calculate this customer's payment score.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead>Document #</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Date Closed</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Days Late</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedCustomer.invoices.map((invoice, index) => {
                                const daysLate = differenceInCalendarDays(invoice['Date Closed']!, invoice['Due Date']!);
                                return (
                                <TableRow key={`${invoice['Document Number']}-${index}`}>
                                    <TableCell>{invoice['Document Number']}</TableCell>
                                    <TableCell>{formatDateTableCell(invoice['Due Date'])}</TableCell>
                                    <TableCell>{formatDateTableCell(invoice['Date Closed'])}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(invoice.Amount)}</TableCell>
                                    <TableCell className="text-center">
                                        {daysLate > 0 ? (
                                            <Badge variant="destructive">{daysLate}</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800">On Time</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
