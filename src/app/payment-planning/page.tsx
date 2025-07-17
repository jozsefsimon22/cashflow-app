
"use client";

import { useContext, useState, useMemo } from "react";
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { CashFlowItem, ManualTransaction, PaymentPlanItem, PaymentPlanSummary } from "@/types";
import { format, startOfToday, isBefore, isEqual } from 'date-fns';
import { HandCoins, Search, CalendarIcon, ArrowUpCircle, ArrowDownCircle, Wallet, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type GroupedPaymentItem = {
    name: string;
    totalAmount: number;
    selectedAmount: number;
    items: PaymentPlanItem[];
};

export default function PaymentPlanningPage() {
    const { data, manualTransactions, startingBalance } = useContext(SettingsContext);

    const [view, setView] = useState<'selection' | 'summary'>('selection');
    const [paymentDate, setPaymentDate] = useState<Date>(startOfToday());
    const [selectedPayables, setSelectedPayables] = useState<Set<string>>(new Set());
    const [selectedReceivables, setSelectedReceivables] = useState<Set<string>>(new Set());

    const [payablesSearch, setPayablesSearch] = useState('');
    const [receivablesSearch, setReceivablesSearch] = useState('');

    const allItems = useMemo((): PaymentPlanItem[] => {
        const items: PaymentPlanItem[] = [];

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
    
    const groupAndCalculate = (
        items: PaymentPlanItem[],
        selectionSet: Set<string>,
        searchTerm: string
    ): GroupedPaymentItem[] => {
        const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const grouped = filteredItems.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = { name: item.name, totalAmount: 0, selectedAmount: 0, items: [] };
            }
            acc[item.name].items.push(item);
            acc[item.name].totalAmount += item.amount;
            if (selectionSet.has(item.id)) {
                acc[item.name].selectedAmount += item.amount;
            }
            return acc;
        }, {} as { [name: string]: GroupedPaymentItem });

        return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    };

    const payables = useMemo(() => {
        const payableItems = allItems.filter(item => item.type === 'outflow');
        return groupAndCalculate(payableItems, selectedPayables, payablesSearch);
    }, [allItems, payablesSearch, selectedPayables]);
    
    const receivables = useMemo(() => {
        const receivableItems = allItems.filter(item => item.type === 'inflow');
        return groupAndCalculate(receivableItems, selectedReceivables, receivablesSearch);
    }, [allItems, receivablesSearch, selectedReceivables]);

    const totals = useMemo(() => {
        const payablesTotal = Array.from(selectedPayables).reduce((sum, id) => {
            const item = allItems.find(i => i.id === id);
            return sum + (item ? item.amount : 0);
        }, 0);

        const receivablesTotal = Array.from(selectedReceivables).reduce((sum, id) => {
            const item = allItems.find(i => i.id === id);
            return sum + (item ? item.amount : 0);
        }, 0);
            
        const closingBalance = startingBalance + receivablesTotal - payablesTotal;

        return { payablesTotal, receivablesTotal, closingBalance };
    }, [allItems, selectedPayables, selectedReceivables, startingBalance]);

    const paymentPlanSummary = useMemo((): PaymentPlanSummary => {
        const allPayableItems = allItems.filter(p => p.type === 'outflow');
        const selectedPayableItems = allPayableItems.filter(p => selectedPayables.has(p.id));
        const remainingOverduePayables = allPayableItems.filter(p => !selectedPayables.has(p.id));

        const paymentsByName = selectedPayableItems.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = 0;
            }
            acc[item.name] += item.amount;
            return acc;
        }, {} as { [name: string]: number });

        const totalRemainingOverdue = remainingOverduePayables.reduce((sum, item) => sum + item.amount, 0);

        return {
            paymentsByName: Object.entries(paymentsByName).map(([name, totalAmount]) => ({ name, totalAmount })),
            totalPayment: totals.payablesTotal,
            remainingOverduePayables,
            totalRemainingOverdue,
        };
    }, [allItems, selectedPayables, totals.payablesTotal]);


    const handleSelect = (id: string, type: 'payable' | 'receivable') => {
        const [selection, setter] = type === 'payable' ? [selectedPayables, setSelectedPayables] : [selectedReceivables, setSelectedReceivables];
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
    
    const handleGroupSelect = (groupItems: PaymentPlanItem[], type: 'payable' | 'receivable') => {
        const [selection, setter] = type === 'payable' ? [selectedPayables, setSelectedPayables] : [selectedReceivables, setSelectedReceivables];
        const groupIds = groupItems.map(i => i.id);
        const areAllSelected = groupIds.every(id => selection.has(id));

        setter(prev => {
            const newSet = new Set(prev);
            if(areAllSelected) {
                groupIds.forEach(id => newSet.delete(id));
            } else {
                groupIds.forEach(id => newSet.add(id));
            }
            return newSet;
        })

    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
    };

    const formatDate = (date: Date) => format(date, 'dd/MM/yyyy');
    
    const AccordionColumnHeader = () => (
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-muted-foreground">
            <div className="col-span-6">Name</div>
            <div className="col-span-2 text-right">Total Due</div>
            <div className="col-span-2 text-right">Selected</div>
            <div className="col-span-2 text-right">Remaining</div>
        </div>
    );

    return (
        <>
            <AppSidebar activePage="payment-planning" />
            <SidebarInset>
                <main className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <h1 className="text-3xl font-bold font-headline text-foreground">Payment Planning</h1>
                    </div>
                    {view === 'selection' && (
                        <>
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
                             <CardContent>
                                <div className="flex justify-end">
                                    <Button onClick={() => setView('summary')} disabled={selectedPayables.size === 0}>
                                        Review Payment Plan <ArrowRight className="ml-2 w-4 h-4"/>
                                    </Button>
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
                                    <AccordionColumnHeader />
                                    <div className="max-h-[60vh] overflow-y-auto pr-2 border-t">
                                        <Accordion type="multiple" className="w-full">
                                            {payables.map(group => (
                                                <AccordionItem value={group.name} key={group.name}>
                                                    <AccordionTrigger className="hover:no-underline">
                                                        <div className="grid grid-cols-12 gap-4 items-center w-full">
                                                          <div className="col-span-6 flex items-center gap-4">
                                                            <Checkbox 
                                                                onClick={(e) => { e.stopPropagation(); handleGroupSelect(group.items, 'payable') }}
                                                                checked={group.items.every(i => selectedPayables.has(i.id))}
                                                                indeterminate={group.items.some(i => selectedPayables.has(i.id)) && !group.items.every(i => selectedPayables.has(i.id))}
                                                            />
                                                            <span className="font-semibold text-left">{group.name}</span>
                                                          </div>
                                                          <div className="col-span-2 text-right font-mono">{formatCurrency(group.totalAmount)}</div>
                                                          <div className="col-span-2 text-right font-mono text-destructive">{formatCurrency(group.selectedAmount)}</div>
                                                          <div className="col-span-2 text-right font-mono text-muted-foreground">{formatCurrency(group.totalAmount - group.selectedAmount)}</div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <Table>
                                                            <TableBody>
                                                                {group.items.map(item => (
                                                                    <TableRow key={item.id} data-state={selectedPayables.has(item.id) ? "selected" : ""}>
                                                                        <TableCell className="w-[50px]"><Checkbox checked={selectedPayables.has(item.id)} onCheckedChange={() => handleSelect(item.id, 'payable')}/></TableCell>
                                                                        <TableCell className="font-medium">{item.docType} #{item.docNumber}</TableCell>
                                                                        <TableCell>{formatDate(item.dueDate)}</TableCell>
                                                                        <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
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
                                    <AccordionColumnHeader />
                                    <div className="max-h-[60vh] overflow-y-auto pr-2 border-t">
                                       <Accordion type="multiple" className="w-full">
                                            {receivables.map(group => (
                                                <AccordionItem value={group.name} key={group.name}>
                                                    <AccordionTrigger className="hover:no-underline">
                                                        <div className="grid grid-cols-12 gap-4 items-center w-full">
                                                          <div className="col-span-6 flex items-center gap-4">
                                                            <Checkbox 
                                                                onClick={(e) => { e.stopPropagation(); handleGroupSelect(group.items, 'receivable') }}
                                                                checked={group.items.every(i => selectedReceivables.has(i.id))}
                                                                indeterminate={group.items.some(i => selectedReceivables.has(i.id)) && !group.items.every(i => selectedReceivables.has(i.id))}
                                                            />
                                                            <span className="font-semibold text-left">{group.name}</span>
                                                          </div>
                                                          <div className="col-span-2 text-right font-mono">{formatCurrency(group.totalAmount)}</div>
                                                          <div className="col-span-2 text-right font-mono text-primary">{formatCurrency(group.selectedAmount)}</div>
                                                          <div className="col-span-2 text-right font-mono text-muted-foreground">{formatCurrency(group.totalAmount - group.selectedAmount)}</div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <Table>
                                                            <TableBody>
                                                                {group.items.map(item => (
                                                                    <TableRow key={item.id} data-state={selectedReceivables.has(item.id) ? "selected" : ""}>
                                                                        <TableCell className="w-[50px]"><Checkbox checked={selectedReceivables.has(item.id)} onCheckedChange={() => handleSelect(item.id, 'receivable')}/></TableCell>
                                                                        <TableCell className="font-medium">{item.docType} #{item.docNumber}</TableCell>
                                                                        <TableCell>{formatDate(item.dueDate)}</TableCell>
                                                                        <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        </>
                    )}

                    {view === 'summary' && (
                        <div className="space-y-8">
                             <div className="flex justify-start">
                                <Button variant="outline" onClick={() => setView('selection')}>
                                    <ArrowLeft className="mr-2 w-4 h-4"/> Back to Selection
                                </Button>
                            </div>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Payments to be Made</CardTitle>
                                    <CardDescription>A summary of the payments you have selected to make.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Payable Name</TableHead>
                                                <TableHead className="text-right">Total Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentPlanSummary.paymentsByName.map(item => (
                                                <TableRow key={item.name}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(item.totalAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell className="font-bold">Total Payments</TableCell>
                                                <TableCell className="text-right font-bold font-mono text-lg text-destructive">{formatCurrency(paymentPlanSummary.totalPayment)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Remaining Overdue Payables</CardTitle>
                                    <CardDescription>These are payables due on or before {format(paymentDate, 'PPP')} that you have chosen not to pay.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                         <TableHeader>
                                            <TableRow>
                                                <TableHead>Payable Name</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentPlanSummary.remainingOverduePayables.length > 0 ? paymentPlanSummary.remainingOverduePayables.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{formatDate(item.dueDate)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                        No remaining overdue payables.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2} className="font-bold">Total Remaining</TableCell>
                                                <TableCell className="text-right font-bold font-mono text-lg text-destructive">{formatCurrency(paymentPlanSummary.totalRemainingOverdue)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </SidebarInset>
        </>
    );
}
