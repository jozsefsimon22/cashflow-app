
"use client";

import { useContext, useMemo, useState } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addWeeks, addMonths, addQuarters, startOfToday, isBefore } from 'date-fns';
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { History, ArrowUpCircle, ArrowDownCircle, CheckCircle, ArrowUpDown, ArrowLeft } from 'lucide-react';
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

type SortKey = keyof Occurrence | 'name';
type SortDirection = 'asc' | 'desc';

const generateAllOccurrences = (manualTransactions: ManualTransaction[], paidOccurrences: ManualTransactionOccurrence[]): Occurrence[] => {
    const items: Occurrence[] = [];
    const forecastEndDate = addWeeks(startOfToday(), 13);
    const today = startOfToday();
    const paidSet = new Set(paidOccurrences.map(p => `${p.transactionId}-${p.dueDate.toISOString()}`));

    manualTransactions.forEach(t => {
        if (t.frequency === 'once') return;

        let currentDate = t.startDate;
        let i = 0;
        let occurrenceCount = 0;

        while (currentDate <= forecastEndDate && i < 1000) {
            if (t.endCondition === 'date' && t.endDate && currentDate > t.endDate) {
                break;
            }
            if (t.endCondition === 'occurrences' && t.occurrences && occurrenceCount >= t.occurrences) {
                break;
            }

            items.push({
                ...t,
                dueDate: currentDate,
                isPaid: paidSet.has(`${t.id}-${currentDate.toISOString()}`),
                isPast: isBefore(currentDate, today),
            });

            occurrenceCount++;
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
    const [isGrouped, setIsGrouped] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'dueDate', direction: 'asc' });


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
        if (!isGrouped) return {};
        return filteredOccurrences.reduce((acc, item) => {
            if (!acc[item.name]) {
                acc[item.name] = [];
            }
            acc[item.name].push(item);
            return acc;
        }, {} as Record<string, Occurrence[]>);
    }, [filteredOccurrences, isGrouped]);

    const sortedGroupedOccurrences = useMemo(() => {
        return Object.entries(groupedOccurrences).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    }, [groupedOccurrences]);
    
    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFlatOccurrences = useMemo(() => {
        if (isGrouped) return [];
        return [...filteredOccurrences].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return a.name.localeCompare(b.name) * (sortConfig.direction === 'asc' ? 1 : -1);
            }
            // Default to sorting by dueDate
            return (a.dueDate.getTime() - b.dueDate.getTime()) * (sortConfig.direction === 'asc' ? 1 : -1);
        });
    }, [filteredOccurrences, isGrouped, sortConfig]);

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
    
    const RenderStatusBadge = ({ item }: { item: Occurrence }) => {
      if (item.isPaid) {
        return <Badge variant="secondary" className="bg-green-500/20 text-green-700">Paid</Badge>;
      }
      if (item.isPast) {
        return item.pastDueHandling === 'manual' ? 
          <Badge variant="destructive">Overdue</Badge> : 
          <Badge variant="secondary">Auto-Paid (Past)</Badge>;
      }
      return <Badge variant="outline">Upcoming</Badge>;
    };

    const RenderActionButtons = ({ item }: { item: Occurrence }) => {
        if (item.isPast && item.pastDueHandling === 'manual' && !item.isPaid) {
            return (
                <Button size="sm" onClick={() => handleMarkAsPaid(item.id, item.dueDate)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Paid
                </Button>
            );
        }
        if (item.isPaid) {
            return (
                <Button size="sm" variant="outline" onClick={() => handleMarkAsUnpaid(item.id, item.dueDate)}>
                    Mark as Unpaid
                </Button>
            );
        }
        return null;
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
            <AppSidebar activePage="manual-transactions" />
            <SidebarInset>
                <main className="p-4 sm:p-6 md:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            
                            <Button variant="outline" size="icon" asChild>
                                <Link href="/manual-transactions">
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="sr-only">Back</span>
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold font-headline text-foreground">Recurring Transaction History</h1>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <History className="w-6 h-6" />
                                    Manage Recurring Payments
                                </CardTitle>
                                <CardDescription>
                                    View all past and future occurrences of your recurring manual transactions. For items set to manual handling, you can mark past due items as paid.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-end gap-4 mb-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="group-toggle"
                                        checked={isGrouped}
                                        onCheckedChange={setIsGrouped}
                                    />
                                    <Label htmlFor="group-toggle">Group by Desc</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="show-paid-toggle"
                                        checked={showPaid}
                                        onCheckedChange={setShowPaid}
                                    />
                                    <Label htmlFor="show-paid-toggle">Show Paid</Label>
                                </div>
                            </div>
                             <div className="max-h-[70vh] overflow-y-auto border-t pt-4">
                                {isGrouped ? (
                                    <>
                                        {sortedGroupedOccurrences.length > 0 ? (
                                            <Accordion type="multiple" className="w-full">
                                                {sortedGroupedOccurrences.map(([name, items]) => (
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
                                                                            <TableCell><RenderStatusBadge item={item} /></TableCell>
                                                                            <TableCell className="text-right"><RenderActionButtons item={item} /></TableCell>
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
                                    </>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <SortableHeader sortKey="name">Description</SortableHeader>
                                                <SortableHeader sortKey="dueDate">Due Date</SortableHeader>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {sortedFlatOccurrences.length > 0 ? (
                                            sortedFlatOccurrences.map((item) => (
                                                 <TableRow key={`${item.id}-${item.dueDate.toISOString()}`} className={cn(item.isPaid && "bg-green-500/10", item.isPast && !item.isPaid && item.pastDueHandling === 'manual' && "bg-destructive/10")}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("inline-flex items-center capitalize", item.type === 'inflow' ? 'text-primary' : 'text-destructive')}>
                                                                {item.type === 'inflow' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                                                            </span>
                                                            <div className="flex flex-col">
                                                                <span>{item.name}</span>
                                                                <span className="text-xs text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{format(item.dueDate, "dd/MM/yyyy")}</TableCell>
                                                    <TableCell><RenderStatusBadge item={item} /></TableCell>
                                                    <TableCell className="text-right"><RenderActionButtons item={item} /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                             <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No results found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </SidebarInset>
        </>
    );
}
