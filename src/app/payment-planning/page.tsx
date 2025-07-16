
"use client";

import { useContext, useState, useMemo } from "react";
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { CashFlowItem, ManualTransaction, ForecastItem, PaymentPlanItem } from "@/types";
import { format, startOfToday, isBefore, isEqual } from 'date-fns';
import { HandCoins, Search, CalendarIcon, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";

type SortKey = 'name' | 'dueDate' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function PaymentPlanningPage() {
    const { data, manualTransactions, startingBalance } = useContext(SettingsContext);

    const [paymentDate, setPaymentDate] = useState<Date>(startOfToday());
    const [selectedPayables, setSelectedPayables] = useState<Set<string>>(new Set());
    const [selectedReceivables, setSelectedReceivables] = useState<Set<string>>(new Set());

    const [payablesSearch, setPayablesSearch] = useState('');
    const [receivablesSearch, setReceivablesSearch] = useState('');

    const [payablesSort, setPayablesSort] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'dueDate', direction: 'asc' });
    const [receivablesSort, setReceivablesSort] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'dueDate', direction: 'asc' });

    const allItems = useMemo((): PaymentPlanItem[] => {
        const items: PaymentPlanItem[] = [];

        // Process imported data
        (data || []).forEach((item, index) => {
            if (item.Status && ['Open', 'Unpaid', 'Pending Approval'].includes(item.Status)) {
                items.push({
                    id: `${item['Document Number']}-${index}`,
                    name: item.Name,
                    type: (item.Type === 'Invoice' || item.Type === 'Credit Memo') ? 'inflow' : 'outflow',
                    docType: item.Type,
                    docNumber: String(item['Document Number']),
                    dueDate: item['Due Date']!,
                    amount: (item.Type === 'Bill Credit' || item.Type === 'Credit Memo') ? -item.RemainingAmount : item.RemainingAmount,
                });
            }
        });

        // Process manual transactions
        manualTransactions.forEach(t => {
            if (t.frequency === 'once' && t.startDate) {
                items.push({
                    id: t.id,
                    name: t.name,
                    type: t.type,
                    docType: t.type === 'inflow' ? 'Manual Inflow' : 'Manual Outflow',
                    docNumber: 'Manual',
                    dueDate: t.startDate,
                    amount: t.amount,
                });
            }
        });

        return items.filter(item => item.dueDate && (isBefore(item.dueDate, paymentDate) || isEqual(item.dueDate, paymentDate)));
    }, [data, manualTransactions, paymentDate]);

    const sortItems = (items: PaymentPlanItem[], config: { key: SortKey, direction: SortDirection }) => {
        return [...items].sort((a, b) => {
            const valA = a[config.key];
            const valB = b[config.key];
            
            if (valA instanceof Date && valB instanceof Date) {
                 return (valA.getTime() - valB.getTime()) * (config.direction === 'asc' ? 1 : -1);
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * (config.direction === 'asc' ? 1 : -1);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * (config.direction === 'asc' ? 1 : -1);
            }
            return 0;
        });
    };

    const payables = useMemo(() => {
        const filtered = allItems.filter(item => item.type === 'outflow' && item.name.toLowerCase().includes(payablesSearch.toLowerCase()));
        return sortItems(filtered, payablesSort);
    }, [allItems, payablesSearch, payablesSort]);

    const receivables = useMemo(() => {
        const filtered = allItems.filter(item => item.type === 'inflow' && item.name.toLowerCase().includes(receivablesSearch.toLowerCase()));
        return sortItems(filtered, receivablesSort);
    }, [allItems, receivablesSearch, receivablesSort]);

    const totals = useMemo(() => {
        const payablesTotal = payables
            .filter(p => selectedPayables.has(p.id))
            .reduce((sum, item) => sum + item.amount, 0);

        const receivablesTotal = receivables
            .filter(r => selectedReceivables.has(r.id))
            .reduce((sum, item) => sum + item.amount, 0);
            
        const closingBalance = startingBalance + receivablesTotal - payablesTotal;

        return { payablesTotal, receivablesTotal, closingBalance };
    }, [payables, receivables, selectedPayables, selectedReceivables, startingBalance]);

    const handleSelect = (id: string, type: 'payable' | 'receivable') => {
        const setter = type === 'payable' ? setSelectedPayables : setSelectedReceivables;
        setter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
    };

    const formatDate = (date: Date) => format(date, 'dd/MM/yyyy');
    
    const requestSort = (type: 'payables' | 'receivables', key: SortKey) => {
        const [config, setter] = type === 'payables' 
            ? [payablesSort, setPayablesSort] 
            : [receivablesSort, setReceivablesSort];
        
        let direction: SortDirection = 'asc';
        if (config.key === key && config.direction === 'asc') {
            direction = 'desc';
        }
        setter({ key, direction });
    };

    return (
        <>
            <AppSidebar activePage="payment-planning" />
            <SidebarInset>
                <main className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <h1 className="text-3xl font-bold font-headline text-foreground">Payment Planning</h1>
                    </div>

                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><HandCoins className="w-6 h-6"/>Planning Summary</CardTitle>
                            <CardDescription>Select a payment date and choose items to see the impact on your balance.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <Label>Payment Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={paymentDate} onSelect={(d) => setPaymentDate(d || startOfToday())} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="p-4 rounded-lg bg-secondary">
                                <div className="text-sm font-medium text-muted-foreground">Starting Balance</div>
                                <div className="text-2xl font-bold font-mono">{formatCurrency(startingBalance)}</div>
                            </div>
                             <div className="p-4 rounded-lg bg-destructive/10">
                                <div className="text-sm font-medium text-muted-foreground">Selected Payments</div>
                                <div className="text-2xl font-bold font-mono text-destructive">{formatCurrency(totals.payablesTotal)}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-primary/10">
                                <div className="text-sm font-medium text-muted-foreground">Projected Closing Balance</div>
                                <div className={cn("text-2xl font-bold font-mono", totals.closingBalance >= 0 ? 'text-primary' : 'text-destructive')}>
                                    {formatCurrency(totals.closingBalance)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2 text-destructive"><ArrowDownCircle/>Payables to Settle</CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search payables..." value={payablesSearch} onChange={e => setPayablesSearch(e.target.value)} className="pl-10"/>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead className="w-[50px]"><Checkbox onCheckedChange={(checked) => {
                                                const allIds = new Set(payables.map(p => p.id));
                                                setSelectedPayables(checked ? allIds : new Set());
                                            }}
                                            checked={selectedPayables.size > 0 && selectedPayables.size === payables.length}
                                            indeterminate={selectedPayables.size > 0 && selectedPayables.size < payables.length}
                                            /></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => requestSort('payables', 'name')}>Name</Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => requestSort('payables', 'dueDate')}>Due</Button></TableHead>
                                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('payables', 'amount')}>Amount</Button></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payables.map(item => (
                                            <TableRow key={item.id} data-state={selectedPayables.has(item.id) ? "selected" : ""}>
                                                <TableCell><Checkbox checked={selectedPayables.has(item.id)} onCheckedChange={() => handleSelect(item.id, 'payable')}/></TableCell>
                                                <TableCell className="font-medium">{item.name}<p className="text-xs text-muted-foreground">{item.docType} #{item.docNumber}</p></TableCell>
                                                <TableCell>{formatDate(item.dueDate)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2 text-primary"><ArrowUpCircle/>Receivables to Include</CardTitle>
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search receivables..." value={receivablesSearch} onChange={e => setReceivablesSearch(e.target.value)} className="pl-10"/>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-card">
                                        <TableRow>
                                            <TableHead className="w-[50px]"><Checkbox onCheckedChange={(checked) => {
                                                const allIds = new Set(receivables.map(p => p.id));
                                                setSelectedReceivables(checked ? allIds : new Set());
                                            }}
                                            checked={selectedReceivables.size > 0 && selectedReceivables.size === receivables.length}
                                            indeterminate={selectedReceivables.size > 0 && selectedReceivables.size < receivables.length}
                                            /></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => requestSort('receivables', 'name')}>Name</Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => requestSort('receivables', 'dueDate')}>Due</Button></TableHead>
                                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('receivables', 'amount')}>Amount</Button></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receivables.map(item => (
                                            <TableRow key={item.id} data-state={selectedReceivables.has(item.id) ? "selected" : ""}>
                                                <TableCell><Checkbox checked={selectedReceivables.has(item.id)} onCheckedChange={() => handleSelect(item.id, 'receivable')}/></TableCell>
                                                <TableCell className="font-medium">{item.name}<p className="text-xs text-muted-foreground">{item.docType} #{item.docNumber}</p></TableCell>
                                                <TableCell>{formatDate(item.dueDate)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </SidebarInset>
        </>
    );
}

    