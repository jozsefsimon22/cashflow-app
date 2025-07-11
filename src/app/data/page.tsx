
"use client";

import { useContext, useMemo, useState } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpDown, Database } from "lucide-react";
import type { CashFlowItem } from "@/types";
import { format } from 'date-fns';

type SortKey = keyof CashFlowItem;

export default function DataPage() {
  const { data } = useContext(SettingsContext);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'Due Date', direction: 'ascending' });

  const sortedData = useMemo(() => {
    let sortableItems = data ? [...data] : [];
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
  }, [data, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/" passHref>
             <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
             </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">Imported Data</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Database className="w-6 h-6" />
              Cash Flow Items
            </CardTitle>
            <CardDescription>
              This table displays the raw data imported from your file. You can sort by clicking the column headers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <SortableHeader sortKey="Type">Type</SortableHeader>
                    <SortableHeader sortKey="Document Number">Document #</SortableHeader>
                    <SortableHeader sortKey="Name">Name</SortableHeader>
                    <SortableHeader sortKey="Due Date">Due Date</SortableHeader>
                    <SortableHeader sortKey="Amount">Amount</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData && sortedData.length > 0 ? (
                    sortedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.Type === 'Invoice' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            {item.Type}
                          </span>
                        </TableCell>
                        <TableCell>{item['Document Number']}</TableCell>
                        <TableCell>{item.Name}</TableCell>
                        <TableCell>{format(item['Due Date'], 'yyyy-MM-dd')}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.Amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No data has been imported yet. Go to the home page to upload a file.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

