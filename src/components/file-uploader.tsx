"use client";

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { CashFlowItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploaderProps {
  onDataUploaded: (data: CashFlowItem[], fileName: string) => void;
}

interface ValidationResult {
  column: string;
  status: 'Passed' | 'Failed';
  message: string;
}

export function FileUploader({ onDataUploaded }: FileUploaderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValidationResults(null);
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
        
        const currentValidationResults: ValidationResult[] = requiredColumns.map(col => {
          if (availableColumns.includes(col)) {
            return { column: col, status: 'Passed', message: 'Column found.' };
          } else {
            return { column: col, status: 'Failed', message: 'Column not found in the uploaded file.' };
          }
        });
        setValidationResults(currentValidationResults);

        const missingColumns = currentValidationResults.filter(r => r.status === 'Failed').map(r => r.column);

        if (missingColumns.length > 0) {
           throw new Error(`The uploaded file is missing required columns. Please check the validation details below.`);
        }

        const typedData: CashFlowItem[] = json.map((row, index) => {
            const dueDate = new Date(row['Due Date']);
            if (isNaN(dueDate.getTime())) {
              throw new Error(`Invalid date format in row ${index + 2} for 'Due Date'.`);
            }
            if(isNaN(Number(row['Amount']))){
              throw new Error(`Invalid number format in row ${index + 2} for 'Amount'.`);
            }
            if(row['Type'] !== 'Invoice' && row['Type'] !== 'Bill'){
              throw new Error(`Invalid value in row ${index + 2} for 'Type'. Must be 'Invoice' or 'Bill'.`);
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
        if (error instanceof Error && !error.message.startsWith('The uploaded file')) {
            // Keep validation results for column errors, but clear for data errors.
        } else if (! (error instanceof Error && error.message.startsWith('The uploaded file'))) {
            setValidationResults(null);
        }
        // Don't clear filename on error, so user can see which file failed.
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
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-4">
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

      {validationResults && (
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-base mb-2">File Validation Summary</h4>
            {validationResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3">
                <div>
                  {result.status === 'Passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn("font-medium", result.status === 'Failed' && "text-destructive")}>
                    {result.column} column: {result.status}
                  </p>
                  <p className="text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
