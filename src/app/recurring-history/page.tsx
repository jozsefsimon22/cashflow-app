
"use client";

import { useContext, useMemo, useState } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addWeeks, addMonths, addQuarters, startOfToday, isBefore } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Settings, BookOpen, GanttChartSquare, Repeat, XCircle, CalendarDays, Download, History, ArrowUpCircle, ArrowDownCircle, CheckCircle } from 'lucide-react';
import type { ManualTransaction, ManualTransactionOccurrence } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Occurrence extends ManualTransaction {
    dueDate: Date;
    isPaid: boolean;
    isPast: boolean;
}

const generateAllOccurrences = (manualTransactions: ManualTransaction[], paidOccurrences: ManualTransactionOccurrence[]): Occurrence[] => {
    const items: Occurrence[] = [];
    const forecastEndDate = addWeeks(startOfToday(), 13);
    const today = startOfToday();
    const paidSet = new Set(paidOccurrences.map(p => `${p.transactionId}-${p.dueDate.toISOString()}`));

    manualTransactions.forEach(t => {
        if (t.frequency === 'once') return;

        let currentDate = t.startDate;
        let i = 0;
        while (currentDate <= forecastEndDate && i < 1000) {
            items.push({
                ...t,
                dueDate: currentDate,
                isPaid: paidSet.has(`${t.id}-${currentDate.toISOString()}`),
                isPast: isBefore(currentDate, today),
            });

            switch (t.frequency) {
                case 'weekly': currentDate = addWeeks(currentDate, 1); break;
                case 'fortnightly': currentDate = addWeeks(currentDate, 2); break;
                case 'monthly': currentDate = addMonths(currentDate, 1); break;
                case 'quarterly': currentDate = addQuarters(currentDate, 1); break;
            }
            i++;
        }
    });

    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
};

export default function RecurringHistoryPage() {
    const { manualTransactions, paidManualOccurrences, setPaidManualOccurrences } = useContext(SettingsContext);
    const { toast } = useToast();
    const [showPaid, setShowPaid] = useState(false);

    const allOccurrences = useMemo(() => {
        return generateAllOccurrences(manualTransactions, paidManualOccurrences);
    }, [manualTransactions, paidManualOccurrences]);
    
    const filteredOccurrences = useMemo(() => {
        if (showPaid) {
            return allOccurrences;
        }
        // Hide items that are manually paid OR are past and set to auto-paid
        return allOccurrences.filter(item => !item.isPaid && !(item.isPast && item.pastDueHandling === 'auto-paid'));
    }, [allOccurrences, showPaid]);

    const groupedOccurrences = useMemo(() => {
        return filteredOccurrences.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = [];
            }
            acc[item.name].push(item);
            return acc;
        }, {} as Record<string, Occurrence[]>);
    }, [filteredOccurrences]);

    const handleMarkAsPaid = (transactionId: string, dueDate: Date) => {
        const newPaidOccurrence: ManualTransactionOccurrence = { transactionId, dueDate };
        setPaidManualOccurrences([...paidManualOccurrences, newPaidOccurrence]);
        toast({
            title: "Transaction Marked as Paid",
            description: `The occurrence for ${format(dueDate, 'PPP')} has been marked as paid.`,
        });
    };
    
    const handleMarkAsUnpaid = (transactionId: string, dueDate: Date) => {
        const newPaidOccurrences = paidManualOccurrences.filter(p => 
            !(p.transactionId === transactionId && p.dueDate.getTime() === dueDate.getTime())
        );
        setPaidManualOccurrences(newPaidOccurrences);
        toast({
            title: "Transaction Marked as Unpaid",
            description: `The occurrence for ${format(dueDate, 'PPP')} has been marked as unpaid.`,
        });
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
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
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link href="/manual-transactions">
                                    <Repeat />
                                    <span>Manual Transactions</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild isActive>
                                <Link href="/recurring-history">
                                    <History />
                                    <span>Recurring History</span>
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
                                <Link href="/export">
                                    <Download />
                                    <span>Export</span>
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
                        <h1 className="text-3xl font-bold font-headline text-foreground">Recurring Transaction History</h1>
                        <SidebarTrigger />
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <History className="w-6 h-6" />
                                    Manage Recurring Payments
                                </CardTitle>
                                <CardDescription>
                                    View all past and future occurrences of your recurring manual transactions, grouped by description. For items set to manual handling, you can mark past due items as paid.
                                </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                                <Switch
                                    id="show-paid-toggle"
                                    checked={showPaid}
                                    onCheckedChange={setShowPaid}
                                />
                                <Label htmlFor="show-paid-toggle">Show Paid</Label>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="max-h-[70vh] overflow-y-auto">
                                {Object.keys(groupedOccurrences).length > 0 ? (
                                    <Accordion type="multiple" className="w-full">
                                        {Object.entries(groupedOccurrences).map(([name, items]) => (
                                            <AccordionItem value={name} key={name}>
                                                <AccordionTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("inline-flex items-center gap-1.5 capitalize", items[0].type === 'inflow' ? 'text-primary' : 'text-destructive')}>
                                                            {items[0].type === 'inflow' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                                        </span>
                                                        <span className="font-semibold">{name}</span>
                                                        <span className="text-muted-foreground font-mono">({formatCurrency(items[0].amount)})</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Due Date</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                <TableHead className="text-right">Action</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {items.map((item) => (
                                                                <TableRow key={`${item.id}-${item.dueDate.toISOString()}`} className={cn(item.isPaid && "bg-green-500/10", item.isPast && !item.isPaid && item.pastDueHandling === 'manual' && "bg-destructive/10")}>
                                                                    <TableCell>{format(item.dueDate, "dd/MM/yyyy")}</TableCell>
                                                                    <TableCell>
                                                                        {item.isPaid ? (
                                                                            <Badge variant="secondary" className="bg-green-500/20 text-green-700">Paid</Badge>
                                                                        ) : item.isPast ? (
                                                                            item.pastDueHandling === 'manual' ? (
                                                                                <Badge variant="destructive">Overdue</Badge>
                                                                            ) : (
                                                                                <Badge variant="secondary">Auto-Paid (Past)</Badge>
                                                                            )
                                                                        ) : (
                                                                            <Badge variant="outline">Upcoming</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {item.isPast && item.pastDueHandling === 'manual' && !item.isPaid && (
                                                                            <Button size="sm" onClick={() => handleMarkAsPaid(item.id, item.dueDate)}>
                                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                                Mark as Paid
                                                                            </Button>
                                                                        )}
                                                                        {item.isPaid && (
                                                                            <Button size="sm" variant="outline" onClick={() => handleMarkAsUnpaid(item.id, item.dueDate)}>
                                                                                Mark as Unpaid
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                ) : (
                                    <div className="flex items-center justify-center text-center text-muted-foreground h-24">
                                        <div>
                                            {allOccurrences.length > 0 ? "All recurring transactions have been paid or are handled automatically." : "No recurring transactions have been added yet."}
                                            {allOccurrences.length > 0 && <p className="text-xs">Toggle "Show Paid" to see all occurrences.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </SidebarInset>
        </>
    );
}

