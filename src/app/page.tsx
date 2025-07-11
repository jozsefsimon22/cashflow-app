"use client";

import { useState } from 'react';
import type { CashFlowItem } from '@/types';
import { FileUploader } from '@/components/file-uploader';
import { InvoiceChart } from '@/components/invoice-chart';
import { SummaryTable } from '@/components/summary-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<CashFlowItem[] | null>(null);

  const handleDataUploaded = (newData: CashFlowItem[], newFileName: string) => {
    setData(newData);
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">VizFlow</h1>
          <p className="mt-2 text-lg text-muted-foreground">Your cash flow, visualized.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6" />
              Upload Your Cash Flow Data
            </CardTitle>
            <CardDescription>
              Upload an Excel file (.xlsx, .xls, .csv) with your cash flow data.
              Please ensure the file has columns: 'Type', 'Document Number', 'Name', 'Due Date', and 'Amount'.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onDataUploaded={handleDataUploaded} />
          </CardContent>
        </Card>

        {data ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <InvoiceChart data={data} />
            </div>
            <div className="lg:col-span-1">
              <SummaryTable data={data} />
            </div>
          </div>
        ) : (
           <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold font-headline text-foreground">Awaiting Data</h3>
            <p className="text-muted-foreground mt-1">Upload your Excel file to see your cash flow analysis.</p>
          </Card>
        )}
      </div>
    </main>
  );
}
