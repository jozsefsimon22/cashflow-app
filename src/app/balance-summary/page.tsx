
"use client";

import { useContext, useMemo, useState } from "react";
import { SettingsContext } from "@/context/settings-context";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookUser, ArrowUpDown, Search, TrendingUp, TrendingDown, Wallet, Users, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import type { CashFlowItem, ManualTransaction, ForecastItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { calculateForecastMetrics } from "@/lib/forecast-engine";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface BalanceSummary {
  name: string;
  receivables: number;
  payables: number;
  netBalance: number;
  items: ForecastItem[];
}

type SortKey = keyof Omit<BalanceSummary, 'items'>;
type SortDirection = 'asc' | 'desc';

export default function BalanceSummaryPage() {
  const { 
    data, 
    manualTransactions, 
    excludedNames, 
    paidManualOccurrences,
    intercompanyNames,
    startingBalance,
    namePairings,
    columnConfig,
  } = useContext(SettingsContext);
  
  const [applyExclusions, setApplyExclusions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'netBalance', direction: 'desc' });
  const [selectedEntity, setSelectedEntity] = useState<BalanceSummary | null>(null);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'receivables' | 'payables' | 'both'>('all');


  const { forecastData } = useMemo(() => {
    return calculateForecastMetrics({
      data,
      manualTransactions,
      paidManualOccurrences,
      startingBalance,
      excludedNames,
      intercompanyNames,
      applyExclusions,
    });
  }, [data, manualTransactions, paidManualOccurrences, startingBalance, excludedNames, intercompanyNames, applyExclusions]);

  const balanceSummary = useMemo((): BalanceSummary[] => {
    const balances: { [name: string]: { receivables: number; payables: number; items: ForecastItem[] } } = {};
    const receivableToPayableMap = new Map(namePairings.map(p => [p.receivableName, p.payableName]));

    forecastData.forEach(item => {
      let name = 'Name' in item ? item.Name : item.name;
      if (!name) return;

      const isReceivableItem = 'type' in item ? item.type === 'inflow' : ['Invoice', 'Credit Memo'].includes(item.Type);
      
      if (isReceivableItem && receivableToPayableMap.has(name)) {
        name = receivableToPayableMap.get(name)!;
      }
      
      if (!balances[name]) {
        balances[name] = { receivables: 0, payables: 0, items: [] };
      }
      balances[name].items.push(item);
      
      let amount;
      if ('frequency' in item) { 
        amount = item.amount;
        if (item.type === 'inflow') {
          balances[name].receivables += amount;
        } else {
          balances[name].payables += amount;
        }
      } else {
        amount = item.RemainingAmount;
        switch (item.Type) {
          case 'Invoice':
            balances[name].receivables += amount;
            break;
          case 'Credit Memo':
            balances[name].receivables -= amount;
            break;
          case 'Bill':
            balances[name].payables += amount;
            break;
          case 'Bill Credit':
            balances[name].payables -= amount;
            break;
        }
      }
    });

    return Object.entries(balances).map(([name, { receivables, payables, items }]) => ({
      name,
      receivables,
      payables,
      netBalance: receivables - payables,
      items,
    }));
  }, [forecastData, namePairings]);
  
  const sortedSummary = useMemo(() => {
    const filteredSummary = balanceSummary
      .filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(item => {
        if (balanceFilter === 'receivables') return item.receivables > 0;
        if (balanceFilter === 'payables') return item.payables > 0;
        if (balanceFilter === 'both') return item.receivables > 0 && item.payables > 0;
        return true;
      });

    return [...filteredSummary].sort((a, b) => {
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
  }, [balanceSummary, sortConfig, searchTerm, balanceFilter]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleCardFilterClick = (filter: 'receivables' | 'payables') => {
    setBalanceFilter(prev => prev === filter ? 'all' : filter);
  };
  
  const handleBothFilterClick = () => {
    setBalanceFilter(prev => prev === 'both' ? 'all' : 'both');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyDialog = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: columnConfig.currency,
    }).format(amount);
  }

  const formatDateDialog = (date: Date | null | undefined) => {
    if (!date) return '';
    return format(date, 'dd/MM/yyyy');
  }
  
  const totals = useMemo(() => {
    return balanceSummary.reduce((acc, item) => {
        acc.receivables += item.receivables;
        acc.payables += item.payables;
        acc.netBalance += item.netBalance;
        return acc;
    }, { receivables: 0, payables: 0, netBalance: 0});
  }, [balanceSummary]);
  
  const dialogDetails = useMemo(() => {
      if (!selectedEntity) return { receivables: [], payables: [] };

      const receivables = selectedEntity.items.filter(item => 'type' in item ? item.type === 'inflow' : ['Invoice', 'Credit Memo'].includes(item.Type));
      const payables = selectedEntity.items.filter(item => 'type' in item ? item.type === 'outflow' : ['Bill', 'Bill Credit'].includes(item.Type));

      return { receivables, payables };
  }, [selectedEntity]);


  return (
    <>
      <AppSidebar activePage="balance-summary" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
           <div className="flex items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold font-headline text-foreground">Balance Summary</h1>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <BookUser className="w-6 h-6" />
                                Customer & Vendor Balances
                            </CardTitle>
                            <CardDescription>
                                A summary of total receivables and payables for each entity. Click a card to filter the list below.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                      <Card
                        className={cn("cursor-pointer transition-all", balanceFilter === 'receivables' && "ring-2 ring-primary")}
                        onClick={() => handleCardFilterClick('receivables')}
                      >
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-primary">{formatCurrency(totals.receivables)}</div>
                          </CardContent>
                      </Card>
                      <Card
                        className={cn("cursor-pointer transition-all", balanceFilter === 'payables' && "ring-2 ring-destructive")}
                        onClick={() => handleCardFilterClick('payables')}
                      >
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
                              <TrendingDown className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.payables)}</div>
                          </CardContent>
                      </Card>
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                              <div className={cn("text-2xl font-bold", totals.netBalance >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(totals.netBalance)}
                              </div>
                          </CardContent>
                      </Card>
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <div className="relative max-w-sm">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                  placeholder="Search by name..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10"
                              />
                          </div>
                          <Button 
                            variant={balanceFilter === 'both' ? 'secondary' : 'outline'} 
                            onClick={handleBothFilterClick}
                            >
                            <Users className="w-4 h-4 mr-2" />
                            Show Both
                          </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                          <Switch
                              id="exclusions-toggle"
                              checked={applyExclusions}
                              onCheckedChange={setApplyExclusions}
                          />
                          <Label htmlFor="exclusions-toggle">Apply Exclusions</Label>
                      </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                          <TableHeader className="sticky top-0 bg-card z-10">
                              <TableRow>
                                  <SortableHeader sortKey="name">Name</SortableHeader>
                                  <SortableHeader sortKey="receivables" className="w-[200px]">Receivables</SortableHeader>
                                  <SortableHeader sortKey="payables" className="w-[200px]">Payables</SortableHeader>
                                  <SortableHeader sortKey="netBalance" className="w-[200px]">Net Balance</SortableHeader>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {sortedSummary.length > 0 ? sortedSummary.map((item) => (
                              <TableRow key={item.name}>
                                  <TableCell className="font-medium">
                                      <Button variant="link" className="p-0 h-auto" onClick={() => setSelectedEntity(item)}>
                                        {item.name}
                                      </Button>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-primary">
                                    {item.receivables !== 0 ? formatCurrency(item.receivables) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-destructive">
                                     {item.payables !== 0 ? formatCurrency(item.payables) : '-'}
                                  </TableCell>
                                  <TableCell className={cn("text-right font-mono font-bold", item.netBalance > 0 ? 'text-primary' : item.netBalance < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                                      {formatCurrency(item.netBalance)}
                                  </TableCell>
                              </TableRow>
                              )) : (
                                  <TableRow>
                                      <TableCell colSpan={4} className="text-center h-24">
                                          No results found matching your search or filter.
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
      <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <DialogContent className="max-w-4xl">
            {selectedEntity && (
                <>
                <DialogHeader>
                    <DialogTitle>Balance Breakdown for {selectedEntity.name}</DialogTitle>
                    <DialogDescription>
                        A complete list of open transactions that make up this entity's balance.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto py-4">
                    
                    {/* Receivables Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowUpCircle className="w-6 h-6 text-primary" />
                            <h3 className="text-lg font-bold text-primary">Receivables</h3>
                        </div>
                        <p className="font-mono text-xl font-bold text-primary mb-4">{formatCurrency(selectedEntity.receivables)}</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Doc #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dialogDetails.receivables.length > 0 ? dialogDetails.receivables.map((item, index) => {
                                    const isManual = 'frequency' in item;
                                    const docNum = isManual ? 'Manual' : item['Document Number'];
                                    const type = isManual ? 'Manual Inflow' : item.Type;
                                    const amount = isManual ? item.amount : item.RemainingAmount;
                                    const displayAmount = !isManual && item.Type === 'Credit Memo' ? -amount : amount;

                                    return (
                                        <TableRow key={`receivable-${docNum}-${index}`}>
                                            <TableCell>{docNum}</TableCell>
                                            <TableCell><Badge variant="outline" className="border-primary text-primary">{type}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrencyDialog(displayAmount)}</TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No receivables.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Payables Column */}
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowDownCircle className="w-6 h-6 text-destructive" />
                            <h3 className="text-lg font-bold text-destructive">Payables</h3>
                        </div>
                        <p className="font-mono text-xl font-bold text-destructive mb-4">{formatCurrency(selectedEntity.payables)}</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Doc #</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dialogDetails.payables.length > 0 ? dialogDetails.payables.map((item, index) => {
                                     const isManual = 'frequency' in item;
                                     const docNum = isManual ? 'Manual' : item['Document Number'];
                                     const type = isManual ? 'Manual Outflow' : item.Type;
                                     const amount = isManual ? item.amount : item.RemainingAmount;
                                     const displayAmount = !isManual && item.Type === 'Bill Credit' ? -amount : amount;

                                    return (
                                        <TableRow key={`payable-${docNum}-${index}`}>
                                            <TableCell>{docNum}</TableCell>
                                            <TableCell><Badge variant="secondary" className="border-destructive text-destructive">{type}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrencyDialog(displayAmount)}</TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No payables.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
