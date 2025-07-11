
"use client";

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { CashFlowItem, ColumnConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { parse, isValid, parseISO } from 'date-fns';

interface FileUploaderProps {
  onDataUploaded: (data: CashFlowItem[]) => void;
  columnConfig: ColumnConfig;
}

interface ValidationResult {
  column: string;
  status: 'Passed' | 'Failed';
  message: string;
}

export function FileUploader({ onDataUploaded, columnConfig }: FileUploaderProps) {
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

  const parseDate = (dateValue: any): Date | null => {
    if (dateValue === null || dateValue === undefined || dateValue === '') return null;

    // Use a specific format from settings first if it's not auto
    if (typeof dateValue === 'string' && columnConfig.dateFormat && columnConfig.dateFormat !== 'auto') {
        const parsed = parse(dateValue, columnConfig.dateFormat.replace(/yyyy/g, 'yyyy').replace(/dd/g, 'dd'), new Date());
        if (isValid(parsed)) return parsed;
    }
    
    // It's already a date object (less likely now, but good fallback)
    if (dateValue instanceof Date) {
        return isValid(dateValue) ? dateValue : null;
    }

    // It's an ISO 8601 string
    if (typeof dateValue === 'string') {
        const parsedISO = parseISO(dateValue);
        if (isValid(parsedISO)) return parsedISO;
    }

    // It's a number (Excel date)
    if (typeof dateValue === 'number') {
        // Excel stores dates as days since 1900-01-01.
        // JS stores dates as ms since 1970-01-01.
        // The offset is 25569 days for Windows, 24107 for Mac 1904. We assume Windows.
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        if (isValid(jsDate)) return jsDate;
    }

    // Last resort, try Date constructor as a fallback for other string formats
    if (typeof dateValue === 'string') {
        const generalParsed = new Date(dateValue);
        if (isValid(generalParsed)) return generalParsed;
    }

    return null;
  };
  
  const parseAmount = (amountValue: any): number | null => {
    if (amountValue === null || amountValue === undefined) return null;
    if (typeof amountValue === 'number') return amountValue;
    if (typeof amountValue === 'string') {
      const cleanedString = amountValue.replace(/[^0-9.-]+/g,"");
      const number = parseFloat(cleanedString);
      return isNaN(number) ? null : number;
    }
    return null;
  }


  const parseFile = (file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellText: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, defval: null });

        const requiredColumns = [
          { name: 'Type', configKey: 'type' },
          { name: 'Document Number', configKey: 'documentNumber' },
          { name: 'Name', configKey: 'name' },
          { name: 'Due Date', configKey: 'dueDate' },
          { name: 'Amount', configKey: 'amount' },
          { name: 'Status', configKey: 'status' },
          { name: 'Date (Fallback)', configKey: 'date' },
        ];
        
        const firstRow = json[0] || {};
        const availableColumns = Object.keys(firstRow);
        
        const currentValidationResults: ValidationResult[] = requiredColumns.map(col => {
          const userColumnName = columnConfig[col.configKey as keyof ColumnConfig];
          if (availableColumns.includes(String(userColumnName))) {
            return { column: `${col.name} (as '${userColumnName}')`, status: 'Passed', message: 'Column found.' };
          } else {
            return { column: `${col.name} (expected '${userColumnName}')`, status: 'Failed', message: 'Column not found in the uploaded file.' };
          }
        });
        setValidationResults(currentValidationResults);

        const missingColumns = currentValidationResults.filter(r => r.status === 'Failed').map(r => r.column);

        if (missingColumns.length > 0) {
           throw new Error(`The uploaded file is missing required columns. Please check the validation details below.`);
        }
        
        const typedData: CashFlowItem[] = json.map((row, index) => {
            const dueDateValue = row[columnConfig.dueDate];
            const dateValue = row[columnConfig.date];

            let dueDate = parseDate(dueDateValue);
            if (dueDate === null) {
              dueDate = parseDate(dateValue);
            }
            
            const amount = parseAmount(row[columnConfig.amount]);

            if (dueDate === null) {
              throw new Error(`Invalid or unreadable date in row ${index + 2}. Neither '${columnConfig.dueDate}' nor fallback '${columnConfig.date}' contain a valid date.`);
            }
            if(amount === null){
              throw new Error(`Invalid number format in row ${index + 2} for column '${columnConfig.amount}'.`);
            }
            if(row[columnConfig.type] !== 'Invoice' && row[columnConfig.type] !== 'Bill'){
              throw new Error(`Invalid value in row ${index + 2} for column '${columnConfig.type}'. Must be 'Invoice' or 'Bill'.`);
            }
            
            return {
                'Type': row[columnConfig.type],
                'Document Number': row[columnConfig.documentNumber],
                'Name': row[columnConfig.name],
                'Due Date': dueDate,
                'Amount': amount,
                'Status': row[columnConfig.status],
            };
        });

        onDataUploaded(typedData);
        toast({
          title: "Success!",
          description: `${file.name} processed successfully. ${json.length} rows imported.`,
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
            {fileName && !loading && !validationResults?.some(v => v.status === 'Failed') ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <UploadCloud className="w-6 h-6 text-primary" />}
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
                    {result.column}: {result.status}
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
