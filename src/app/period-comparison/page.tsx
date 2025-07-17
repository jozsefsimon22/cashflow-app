
"use client";

import { useContext, useMemo, useState } from "react";
import { format, isBefore, isEqual, isAfter, startOfToday, addWeeks, addMonths, addQuarters } from 'date-fns';
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Scale, ArrowRight, ArrowUp, ArrowDown, ArrowUpDown, PlusCircle, MinusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { CashFlowItem, ManualTransaction, PeriodMetrics, ForecastItem, GroupedItems, DiffDialogDetails } from "@/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const getAmount = (item: ForecastItem) => 'frequency' in item ? item.amount : (item as CashFlowItem).Amount;

const calculateMetricsForPeriod = (
    data: CashFlowItem[] | null, 
    manualTransactions: ManualTransaction[],
    intercompanyNames: string[],
    upToDate: Date | undefined
): PeriodMetrics => {
    let metrics: PeriodMetrics = {
        receivables: 0, payables: 0, net: 0,
        standardReceivables: 0, intercompanyReceivables: 0, manualReceivables: 0,
        standardPayables: 0, intercompanyPayables: 0, manualPayables: 0,
        standardReceivablesItems: [], intercompanyReceivablesItems: [], manualReceivablesItems: [],
        standardPayablesItems: [], intercompanyPayablesItems: [], manualPayablesItems: [],
    };

    if (!upToDate) return metrics;

    const intercompanyNamesSet = new Set(intercompanyNames);

    const openTransactions: ForecastItem[] = (data || [])
      .filter(item => {
          const transactionDate = item.Date;
          const closedDate = item['Date Closed'];
          
          const isCreated = transactionDate && (isBefore(transactionDate, upToDate) || isEqual(transactionDate, upToDate));
          if (!isCreated) return false;

          const isOpen = !closedDate || isAfter(closedDate, upToDate);
          return isOpen;
      })
      .map(item => ({...item, dueDate: item['Due Date']!}));

    openTransactions.forEach(item => {
        const cashFlowItem = item as CashFlowItem;
        const isIntercompany = intercompanyNamesSet.has(cashFlowItem.Name);
        const amount = getAmount(item);

        if (cashFlowItem.Type === 'Invoice' || cashFlowItem.Type === 'Credit Memo') {
            const effectiveAmount = cashFlowItem.Type === 'Invoice' ? amount : -amount;
            metrics.receivables += effectiveAmount;
            if (isIntercompany) {
                metrics.intercompanyReceivables += effectiveAmount;
                metrics.intercompanyReceivablesItems.push(item);
            } else {
                metrics.standardReceivables += effectiveAmount;
                metrics.standardReceivablesItems.push(item);
            }
        } else if (cashFlowItem.Type === 'Bill' || cashFlowItem.Type === 'Bill Credit') {
             const effectiveAmount = cashFlowItem.Type === 'Bill' ? amount : -amount;
             metrics.payables += effectiveAmount;
             if (isIntercompany) {
                metrics.intercompanyPayables += effectiveAmount;
                metrics.intercompanyPayablesItems.push(item);
            } else {
                metrics.standardPayables += effectiveAmount;
                metrics.standardPayablesItems.push(item);
            }
        }
    });
    
    const allManualItems: ForecastItem[] = [];

    manualTransactions.forEach(t => {
        if (isAfter(t.startDate, upToDate)) return;

        if (t.frequency === 'once') {
            allManualItems.push({ ...t, dueDate: t.startDate });
        } else {
            let currentDate = t.startDate;
            let occurrenceCount = 0;
            while (isBefore(currentDate, upToDate) || isEqual(currentDate, upToDate)) {
                 if (t.endCondition === 'date' && t.endDate && isAfter(currentDate, t.endDate)) break;
                 if (t.endCondition === 'occurrences' && t.occurrences && occurrenceCount >= t.occurrences) break;
                allManualItems.push({ ...t, dueDate: currentDate });
                occurrenceCount++;
                switch (t.frequency) {
                    case 'weekly': currentDate = addWeeks(currentDate, 1); break;
                    case 'fortnightly': currentDate = addWeeks(currentDate, 2); break;
                    case 'monthly': currentDate = addMonths(currentDate, 1); break;
                    case 'quarterly': currentDate = addQuarters(currentDate, 1); break;
                }
            }
        }
    });

    allManualItems.forEach(item => {
        const manualItem = item as ManualTransaction & { dueDate: Date };
        const isIntercompany = intercompanyNamesSet.has(manualItem.name);
        const amount = manualItem.amount;
        
        if (manualItem.type === 'inflow') {
            metrics.receivables += amount;
            if(isIntercompany) {
                metrics.intercompanyReceivables += amount;
                metrics.intercompanyReceivablesItems.push(item);
            } else {
                metrics.manualReceivables += amount;
                metrics.manualReceivablesItems.push(item);
            }
        } else {
            metrics.payables += amount;
            if(isIntercompany) {
                metrics.intercompanyPayables += amount;
                metrics.intercompanyPayablesItems.push(item);
            } else {
                metrics.manualPayables += amount;
                metrics.manualPayablesItems.push(item);
            }
        }
    });

    metrics.net = metrics.receivables - metrics.payables;
    return metrics;
};

interface PeriodDialogDetails {
    title: string;
    items: ForecastItem[];
    total: number;
}
type SortKey = 'name' | 'amount';
type SortDirection = 'asc' | 'desc';

const getItemId = (item: ForecastItem): string => {
    if ('frequency' in item) { // ManualTransaction
        return `${item.id}-${item.dueDate.toISOString()}`;
    }
    // CashFlowItem
    return `${item['Document Number']}${item['Installment Number'] || ''}`;
}

const getItemName = (item: ForecastItem): string => {
    return 'frequency' in item ? item.name : (item as CashFlowItem).Name;
}

export default function PeriodComparisonPage() {
    const { data, manualTransactions, intercompanyNames, columnConfig } = useContext(SettingsContext);
    const [dateA, setDateA] = useState<Date | undefined>(new Date());
    const [dateB, setDateB] = useState<Date | undefined>(undefined);
    const [periodDialogDetails, setPeriodDialogDetails] = useState<PeriodDialogDetails | null>(null);
    const [diffDialogDetails, setDiffDialogDetails] = useState<DiffDialogDetails | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'amount', direction: 'desc' });

    const metricsA = useMemo(() => calculateMetricsForPeriod(data, manualTransactions, intercompanyNames, dateA), [data, manualTransactions, intercompanyNames, dateA]);
    const metricsB = useMemo(() => calculateMetricsForPeriod(data, manualTransactions, intercompanyNames, dateB), [data, manualTransactions, intercompanyNames, dateB]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: columnConfig.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleCellClick = (title: string, items: ForecastItem[] | undefined, total: number) => {
        if (items && items.length > 0) {
            setPeriodDialogDetails({ title, items, total });
        }
    };
    
    const handleDiffClick = (title: string, itemsA: ForecastItem[] = [], itemsB: ForecastItem[] = []) => {
        const valueA = itemsA.reduce((sum, item) => sum + getAmount(item), 0);
        const valueB = itemsB.reduce((sum, item) => sum + getAmount(item), 0);
        const diff = valueB - valueA;
        
        if (diff === 0 && itemsA.length === 0 && itemsB.length === 0) return;

        const setA = new Set(itemsA.map(getItemId));
        const setB = new Set(itemsB.map(getItemId));
        
        const newItems = itemsB.filter(item => !setA.has(getItemId(item)));
        const closedItems = itemsA.filter(item => !setB.has(getItemId(item)));

        const changesByName: { [name: string]: { name: string; netChange: number; newItems: ForecastItem[]; closedItems: ForecastItem[] } } = {};

        const processItems = (items: ForecastItem[], factor: 1 | -1) => {
            items.forEach(item => {
                const name = getItemName(item);
                let amount = getAmount(item);

                if (!('frequency' in item)) { // CashFlowItem
                    const cashFlowItem = item as CashFlowItem;
                    if (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') {
                        amount = -amount;
                    }
                }
                
                if (!changesByName[name]) {
                    changesByName[name] = { name, netChange: 0, newItems: [], closedItems: [] };
                }
                changesByName[name].netChange += amount * factor;
                if (factor === 1) {
                    changesByName[name].newItems.push(item);
                } else {
                    changesByName[name].closedItems.push(item);
                }
            });
        };

        processItems(newItems, 1);
        processItems(closedItems, -1);
        
        const customerChanges = Object.values(changesByName).sort((a,b) => Math.abs(b.netChange) - Math.abs(a.netChange));

        setDiffDialogDetails({
            title: `Change in ${title}`,
            customerChanges,
        });
    }
    
    const DatePicker = ({ date, setDate, label }: { date: Date | undefined, setDate: (d: Date | undefined) => void, label: string }) => (
         <div className="grid gap-2">
            <h3 className="text-center font-semibold">{label}</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[260px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "LLL dd, y") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
          </div>
    );
    
    const ComparisonRow = ({ title, valueA, itemsA, valueB, itemsB, isIncreaseGood, isSubcategory = false }: { title: string, valueA: number, itemsA: ForecastItem[] | undefined, valueB: number, itemsB: ForecastItem[] | undefined, isIncreaseGood: boolean, isSubcategory?: boolean }) => {
        const diff = valueB - valueA;
        const perc = useMemo(() => {
             if (valueA === 0) return valueB === 0 ? 0 : Infinity;
             return ((valueB - valueA) / Math.abs(valueA)) * 100;
        }, [valueA, valueB]);
        
        const hasChanged = diff !== 0;

        let colorClass = "text-muted-foreground";
        if (hasChanged) {
          colorClass = diff > 0 ? (isIncreaseGood ? "text-primary" : "text-destructive") : (isIncreaseGood ? "text-destructive" : "text-primary");
        }

        const formatPercentage = (p: number) => {
            if (p === Infinity) return <Badge variant="secondary" className="bg-green-100 text-green-800">New</Badge>;
            if (!hasChanged) return <span className="text-muted-foreground">0.0%</span>
            const plus = p > 0 ? '+' : '';
            return <span className={cn(colorClass)}>{`${plus}${p.toFixed(1)}%`}</span>;
        };

        const handleDiffRowClick = () => {
             handleDiffClick(title, itemsA, itemsB);
        }

        return (
            <TableRow className={cn(!isSubcategory && "bg-secondary/50 font-semibold")}>
                <TableCell className={cn(isSubcategory && "pl-8")}>{title}</TableCell>
                <TableCell 
                    className={cn("text-right font-mono", itemsA && itemsA.length > 0 && "cursor-pointer hover:underline")}
                    onClick={() => handleCellClick(`${title} - As at ${dateA ? format(dateA, 'dd/MM/yy') : ''}`, itemsA, valueA)}
                >
                    {formatCurrency(valueA)}
                </TableCell>
                <TableCell 
                    className={cn("text-right font-mono", itemsB && itemsB.length > 0 && "cursor-pointer hover:underline")}
                    onClick={() => handleCellClick(`${title} - As at ${dateB ? format(dateB, 'dd/MM/yy') : ''}`, itemsB, valueB)}
                >
                    {formatCurrency(valueB)}
                </TableCell>
                <TableCell 
                  className={cn("text-right font-mono", colorClass, hasChanged && "cursor-pointer hover:underline")}
                  onClick={handleDiffRowClick}
                >
                    <div className="flex items-center justify-end gap-1">
                        {hasChanged && (diff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        {formatCurrency(diff)}
                    </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                    {formatPercentage(perc)}
                </TableCell>
            </TableRow>
        );
    }
    
    const CategoryHeader = ({ title }: { title: string }) => (
        <TableRow className="bg-secondary/20">
            <TableCell colSpan={5} className="font-bold text-lg text-foreground">{title}</TableCell>
        </TableRow>
    );

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const groupAndSortItems = (items: ForecastItem[]) => {
       if (!items) return [];
        const grouped = items.reduce((acc: GroupedItems, item) => {
            const name = getItemName(item) || 'Unnamed';
            let amount = getAmount(item);

            if (!('frequency' in item)) {
                 const cashFlowItem = item as CashFlowItem;
                 if (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') {
                    amount = -amount;
                 }
            }

            if (!acc[name]) {
              acc[name] = { total: 0, items: [] };
            }
            acc[name].total += amount;
            acc[name].items.push(item);
            return acc;
          }, {});
          
        return Object.entries(grouped).sort(([, a], [, b]) => {
            if (sortConfig.key === 'name') {
                const prefixRegex = /^CUS\d{1,5}\s+/i;
                const nameA = (getItemName(a.items[0]) || '').replace(prefixRegex, '');
                const nameB = (getItemName(b.items[0]) || '').replace(prefixRegex, '');
                return nameA.localeCompare(nameB) * (sortConfig.direction === 'asc' ? 1 : -1);
            }
            return (b.total - a.total) * (sortConfig.direction === 'asc' ? -1 : 1);
        });
    }

    const groupedPeriodDialogItems = useMemo(() => groupAndSortItems(periodDialogDetails?.items || []), [periodDialogDetails, sortConfig]);
    
    const sortedCustomerChanges = useMemo(() => {
        if (!diffDialogDetails) return [];
        return [...diffDialogDetails.customerChanges].sort((a, b) => {
            if (sortConfig.key === 'name') {
                const prefixRegex = /^CUS\d{1,5}\s+/i;
                const cleanAName = a.name.replace(prefixRegex, '');
                const cleanBName = b.name.replace(prefixRegex, '');
                return cleanAName.localeCompare(cleanBName) * (sortConfig.direction === 'asc' ? 1 : -1);
            }
            // sort by net amount
            return (b.netChange - a.netChange) * (sortConfig.direction === 'desc' ? 1 : -1);
        });
    }, [diffDialogDetails, sortConfig]);

    const renderTransactionTable = (items: ForecastItem[], title: string) => {
        if (items.length === 0) return null;
        
        const subtotal = items.reduce((sum, item) => {
            let amount = getAmount(item);
            if (!('frequency' in item)) {
                const cashFlowItem = item as CashFlowItem;
                if (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') {
                    amount = -amount;
                }
            }
            return sum + amount;
        }, 0);

        return (
            <div className="pt-2">
                 <h4 className="font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    {title === 'New Transactions' && <PlusCircle className="w-4 h-4 text-green-500" />}
                    {title === 'Closed Transactions' && <MinusCircle className="w-4 h-4 text-red-500" />}
                    {title}
                 </h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Document #</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => {
                            const isManual = 'frequency' in item;
                            const id = isManual ? 'Recurring' : (item as CashFlowItem)['Document Number'];
                            const type = isManual ? 'Manual' : (item as CashFlowItem).Type;
                            const dueDate = (item as any).dueDate;
                            let amount = getAmount(item);
                            if (!isManual) {
                                const cashFlowItem = item as CashFlowItem;
                                if (cashFlowItem.Type === 'Credit Memo' || cashFlowItem.Type === 'Bill Credit') {
                                    amount = -amount;
                                }
                            }
                            return (
                                <TableRow key={`${id}-${index}`}>
                                    <TableCell>{id}</TableCell>
                                    <TableCell>{dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{type}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                            <TableCell className={cn("text-right font-mono font-semibold", subtotal >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(subtotal)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        )
    };

    const renderTransactionList = (items: [string, GroupedItems[string]][]) => (
        <Accordion type="single" collapsible className="w-full">
            {items.length > 0 ? items.map(([name, group]) => (
                <AccordionItem value={name} key={`breakdown-${name}`}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                        <span>{name}</span>
                        <span className="font-mono">{formatCurrency(group.total)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        {renderTransactionTable(group.items, '')}
                    </AccordionContent>
                </AccordionItem>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No transactions found.</p>}
        </Accordion>
    );


  return (
    <>
      <AppSidebar activePage="period-comparison" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
           <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-headline text-foreground">Period Comparison</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Scale className="w-6 h-6" />
                        Select Dates to Compare
                    </CardTitle>
                    <CardDescription>
                        Choose two dates to compare the total balance of open transactions. The analysis includes all transactions (imported and manual) that were created on or before the selected date and were not yet closed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                        <DatePicker date={dateA} setDate={setDateA} label="Date A" />
                        <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                        <DatePicker date={dateB} setDate={setDateB} label="Date B" />
                    </div>
                </CardContent>
            </Card>

            {!data ? (
                 <Card className="mt-8 flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Please go to the <Link href="/data" className="text-primary underline">Imported Data</Link> page to upload a file with transaction history to use this feature.
                    </p>
                </Card>
            ) : !dateB ? (
                 <Card className="mt-8 flex flex-col items-center justify-center p-12 text-center border-dashed">
                     <h3 className="text-xl font-semibold font-headline text-foreground">Select Date B</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Please select a second date to see the comparison.
                    </p>
                 </Card>
            ) : (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="font-headline">Comparison Results</CardTitle>
                        <CardDescription>Comparing total balances of open transactions up to and including the selected dates. Click a value for a breakdown.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[220px]">Category</TableHead>
                                    <TableHead className="text-right">As at {dateA ? format(dateA, 'dd/MM/yy') : 'Period A'}</TableHead>
                                    <TableHead className="text-right">As at {dateB ? format(dateB, 'dd/MM/yy') : 'Period B'}</TableHead>
                                    <TableHead className="text-right">Change</TableHead>
                                    <TableHead className="text-right">Change (%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <CategoryHeader title="Receivables" />
                                <ComparisonRow title="Standard" valueA={metricsA.standardReceivables} itemsA={metricsA.standardReceivablesItems} valueB={metricsB.standardReceivables} itemsB={metricsB.standardReceivablesItems} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Intercompany" valueA={metricsA.intercompanyReceivables} itemsA={metricsA.intercompanyReceivablesItems} valueB={metricsB.intercompanyReceivables} itemsB={metricsB.intercompanyReceivablesItems} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Manual" valueA={metricsA.manualReceivables} itemsA={metricsA.manualReceivablesItems} valueB={metricsB.manualReceivables} itemsB={metricsB.manualReceivablesItems} isIncreaseGood={true} isSubcategory />
                                <ComparisonRow title="Total Receivables" valueA={metricsA.receivables} itemsA={[...metricsA.standardReceivablesItems, ...metricsA.intercompanyReceivablesItems, ...metricsA.manualReceivablesItems]} valueB={metricsB.receivables} itemsB={[...metricsB.standardReceivablesItems, ...metricsB.intercompanyReceivablesItems, ...metricsB.manualReceivablesItems]} isIncreaseGood={true} />

                                <CategoryHeader title="Payables" />
                                <ComparisonRow title="Standard" valueA={metricsA.standardPayables} itemsA={metricsA.standardPayablesItems} valueB={metricsB.standardPayables} itemsB={metricsB.standardPayablesItems} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Intercompany" valueA={metricsA.intercompanyPayables} itemsA={metricsA.intercompanyPayablesItems} valueB={metricsB.intercompanyPayables} itemsB={metricsB.intercompanyPayablesItems} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Manual" valueA={metricsA.manualPayables} itemsA={metricsA.manualPayablesItems} valueB={metricsB.manualPayables} itemsB={metricsB.manualPayablesItems} isIncreaseGood={false} isSubcategory />
                                <ComparisonRow title="Total Payables" valueA={metricsA.payables} itemsA={[...metricsA.standardPayablesItems, ...metricsA.intercompanyPayablesItems, ...metricsA.manualPayablesItems]} valueB={metricsB.payables} itemsB={[...metricsB.standardPayablesItems, ...metricsB.intercompanyPayablesItems, ...metricsB.manualPayablesItems]} isIncreaseGood={false} />
                                
                                <TableRow className="border-t-2 border-primary/20">
                                    <TableCell colSpan={5}></TableCell>
                                </TableRow>

                                <ComparisonRow title="Net Position" valueA={metricsA.net} itemsA={[...metricsA.standardReceivablesItems, ...metricsA.intercompanyReceivablesItems, ...metricsA.manualReceivablesItems, ...metricsA.standardPayablesItems, ...metricsA.intercompanyPayablesItems, ...metricsA.manualPayablesItems]} valueB={metricsB.net} itemsB={[...metricsB.standardReceivablesItems, ...metricsB.intercompanyReceivablesItems, ...metricsB.manualReceivablesItems, ...metricsB.standardPayablesItems, ...metricsB.intercompanyPayablesItems, ...metricsB.manualPayablesItems]} isIncreaseGood={true} />
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </main>
      </SidebarInset>

       <Dialog open={!!periodDialogDetails} onOpenChange={() => setPeriodDialogDetails(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{periodDialogDetails?.title}</DialogTitle>
            <DialogDescription>
              A breakdown of open transactions making up this total, grouped by name.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xl font-bold font-mono text-primary">{formatCurrency(periodDialogDetails?.total || 0)}</p>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={() => requestSort('name')}>
                    Sort by Name
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
                  <Button variant="ghost" size="sm" onClick={() => requestSort('amount')}>
                    Sort by Amount
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'amount' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
            </div>
          </div>
           <div className="max-h-[60vh] overflow-y-auto mt-4 p-1">
             {renderTransactionList(groupedPeriodDialogItems)}
          </div>
        </DialogContent>
      </Dialog>
      
       <Dialog open={!!diffDialogDetails} onOpenChange={() => setDiffDialogDetails(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{diffDialogDetails?.title}</DialogTitle>
            <DialogDescription>
              Net change per entity between {dateA ? format(dateA, 'dd/MM/yy') : 'Date A'} and {dateB ? format(dateB, 'dd/MM/yy') : 'Date B'}.
            </DialogDescription>
          </DialogHeader>
           <div className="flex items-center justify-end gap-2">
                 <Button variant="ghost" size="sm" onClick={() => requestSort('name')}>
                    Sort by Name
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
                  <Button variant="ghost" size="sm" onClick={() => requestSort('amount')}>
                    Sort by Amount
                    <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'amount' ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                 </Button>
            </div>
           <div className="max-h-[60vh] overflow-y-auto mt-4 p-1">
             <Accordion type="single" collapsible className="w-full">
                {sortedCustomerChanges.map(change => (
                     <AccordionItem value={change.name} key={change.name}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>{change.name}</span>
                                <span className={cn("font-mono", change.netChange >= 0 ? "text-primary" : "text-destructive")}>
                                    {change.netChange >= 0 ? '+' : ''}{formatCurrency(change.netChange)}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                           {renderTransactionTable(change.newItems, 'New Transactions')}
                           {renderTransactionTable(change.closedItems, 'Closed Transactions')}
                        </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
