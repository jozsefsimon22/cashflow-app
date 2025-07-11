"use client";

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { CashFlowItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileUploaderProps {
  onDataUploaded: (data: CashFlowItem[], fileName: string) => void;
}

export function FileUploader({ onDataUploaded }: FileUploaderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const parseFile = (file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        const requiredColumns = ['Type', 'Document Number', 'Name', 'Due Date', 'Amount'];
        const firstRow = json[0] || {};
        const availableColumns = Object.keys(firstRow);
        const hasRequiredColumns = requiredColumns.every(col => availableColumns.includes(col));

        if (!hasRequiredColumns) {
          throw new Error("Invalid file format. Please ensure all required columns are present: " + requiredColumns.join(', '));
        }

        const typedData: CashFlowItem[] = json.map((row, index) => {
            const dueDate = new Date(row['Due Date']);
            if (isNaN(dueDate.getTime()) || isNaN(Number(row['Amount'])) || (row['Type'] !== 'Invoice' && row['Type'] !== 'Bill')) {
                throw new Error(`Invalid data in row ${index + 2}. 'Due Date' must be a valid date, 'Amount' must be a number, and 'Type' must be 'Invoice' or 'Bill'.`);
            }
            return {
                'Type': row['Type'],
                'Document Number': row['Document Number'],
                'Name': row['Name'],
                'Due Date': dueDate,
                'Amount': Number(row['Amount']),
            };
        });

        onDataUploaded(typedData, file.name);
        toast({
          title: "Success!",
          description: `${file.name} processed successfully.`,
        });
      } catch (error) {
        console.error("File parsing error:", error);
        toast({
          variant: "destructive",
          title: "Error Parsing File",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
        setFileName(null);
      } finally {
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="w-full flex flex-col sm:flex-row items-center gap-4">
      <Label htmlFor="file-upload" className="flex-1">
        <div className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
          {fileName && !loading ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <UploadCloud className="w-6 h-6 text-primary" />}
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{fileName || "Click to upload a file"}</span>
            <span className="text-sm text-muted-foreground">XLSX, XLS, CSV</span>
          </div>
        </div>
      </Label>
      <Input
        id="file-upload"
        type="file"
        ref={inputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        disabled={loading}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Processing..." : "Browse Files"}
      </Button>
    </div>
  );
}
