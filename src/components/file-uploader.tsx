
"use client";

import { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { CashFlowItem, ColumnConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { parse, isValid, parseISO } from 'date-fns';
import { Progress } from "@/components/ui/progress";
import { SettingsContext } from '@/context/settings-context';


interface FileUploaderProps {
  onDataUploaded: (data: CashFlowItem[]) => void;
  columnConfig: ColumnConfig;
}

interface ValidationResult {
  column: string;
  status: 'Passed' | 'Failed' | 'Optional';
  message: string;
}

const VALID_TYPES = ['Invoice', 'Bill', 'Bill Credit', 'Credit Memo'];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function FileUploader({ onDataUploaded, columnConfig: propColumnConfig }: FileUploaderProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setData, setManualTransactions, setExcludedNames, setStartingBalance, setColumnConfig, setIntercompanyNames, setPaidManualOccurrences, setNamePairings } = useContext(SettingsContext);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValidationResults(null);
      setProgress(0);
      setProgressMessage('');
      
      if (file.name.endsWith('.json')) {
        parseJsonFile(file);
      } else {
        parseExcelFile(file);
      }
    }
  };

  const parseJsonFile = (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setProgressMessage('Reading session file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const sessionData = JSON.parse(text);

        // Validate structure
        if (!sessionData.data || !sessionData.manualTransactions || !sessionData.columnConfig) {
          throw new Error("Invalid session file format.");
        }
        
        await sleep(10);
        setProgress(25);
        setProgressMessage('Loading settings...');
        setColumnConfig(sessionData.columnConfig);
        setStartingBalance(sessionData.startingBalance || 0);
        setExcludedNames(sessionData.excludedNames || []);
        setIntercompanyNames(sessionData.intercompanyNames || []);
        setNamePairings(sessionData.namePairings || []);
        
        await sleep(10);
        setProgress(50);
        setProgressMessage('Loading manual transactions...');
        const transactionsWithDates = sessionData.manualTransactions.map((t: any) => ({
            ...t,
            startDate: new Date(t.startDate),
        }));
        setManualTransactions(transactionsWithDates);
        
        // Also load paid manual occurrences
        if (sessionData.paidManualOccurrences) {
            const occurrencesWithDates = sessionData.paidManualOccurrences.map((o: any) => ({
              ...o,
              dueDate: new Date(o.dueDate)
            }));
            setPaidManualOccurrences(occurrencesWithDates);
        } else {
            setPaidManualOccurrences([]);
        }


        await sleep(10);
        setProgress(75);
        setProgressMessage('Loading imported data...');
        const dataWithDates = sessionData.data.map((item: any) => ({
          ...item,
          'Due Date': item['Due Date'] ? new Date(item['Due Date']) : null,
          'Date': item['Date'] ? new Date(item['Date']) : null,
          'Date Closed': item['Date Closed'] ? new Date(item['Date Closed']) : null,
        }));
        setData(dataWithDates);

        await sleep(10);
        setProgress(100);
        setProgressMessage('Session loaded successfully!');
        
        toast({
          title: "Session Loaded",
          description: `Successfully imported session data from ${file.name}.`,
        });

      } catch (error) {
        console.error("JSON file parsing error:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Session",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
      } finally {
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  }

  const parseDate = (dateValue: any): Date | null => {
    if (dateValue === null || dateValue === undefined || String(dateValue).trim() === '') return null;
  
    if (dateValue instanceof Date && isValid(dateValue)) {
      return dateValue;
    }
  
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const excelDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      if (isValid(excelDate)) {
        return excelDate;
      }
    }
  
    if (typeof dateValue === 'string') {
      const dateString = dateValue.trim();
      
      if (propColumnConfig.dateFormat && propColumnConfig.dateFormat !== 'auto') {
        const parsed = parse(dateString, propColumnConfig.dateFormat, new Date());
        if (isValid(parsed)) return parsed;
      }
      
      let parsed = parseISO(dateString);
      if (isValid(parsed)) return parsed;

      const commonFormats = [
        'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'dd-MM-yyyy',
        'dd/MM/yy', 'MM/dd/yy', 'dd-MMM-yy', 'dd-MMM-yyyy'
      ];

      for (const format of commonFormats) {
        parsed = parse(dateString, format, new Date());
        if (isValid(parsed)) return parsed;
      }
  
      parsed = new Date(dateString);
      if (isValid(parsed)) return parsed;
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


  const parseExcelFile = (file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setProgressMessage('Reading file...');
        await sleep(10); 
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        setProgressMessage('Parsing data...');
        await sleep(10);
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { raw: true, defval: null });

        setProgressMessage('Validating columns...');
        await sleep(10);
        const requiredColumns = [
          { name: 'Type', configKey: 'type', optional: false },
          { name: 'Document Number', configKey: 'documentNumber', optional: false },
          { name: 'Name', configKey: 'name', optional: false },
          { name: 'Due Date', configKey: 'dueDate', optional: false },
          { name: 'Amount (Original)', configKey: 'amount', optional: false },
          { name: 'Remaining Amount', configKey: 'remainingAmount', optional: false },
          { name: 'Status', configKey: 'status', optional: true },
          { name: 'Date (Fallback)', configKey: 'date', optional: false },
          { name: 'Date Closed', configKey: 'dateClosed', optional: true },
          { name: 'Installment Due Date', configKey: 'installmentDueDate', optional: true },
          { name: 'Installment Amount', configKey: 'installmentAmount', optional: true },
          { name: 'Installment Number', configKey: 'installmentNumber', optional: true },
          { name: 'Installment Status', configKey: 'installmentStatus', optional: true },
        ];
        
        const firstRow = json[0] || {};
        const availableColumns = Object.keys(firstRow);
        
        let statusColumnFound = false;

        const currentValidationResults: ValidationResult[] = requiredColumns.map(col => {
          const userColumnName = propColumnConfig[col.configKey as keyof ColumnConfig] ?? '';
          const found = availableColumns.includes(String(userColumnName));

          if (col.configKey === 'status' && found) {
            statusColumnFound = true;
          }

          if (found || !userColumnName) {
             if (col.optional) {
                return { column: `${col.name} (as '${userColumnName}')`, status: 'Optional', message: userColumnName ? 'Column found.' : 'Column not configured.' };
             }
             if (found) {
                return { column: `${col.name} (as '${userColumnName}')`, status: 'Passed', message: 'Column found.' };
             }
          }

          if (col.optional) {
            return { column: `${col.name} (expected '${userColumnName}')`, status: 'Optional', message: `Column not found. This is optional.` };
          }
          return { column: `${col.name} (expected '${userColumnName}')`, status: 'Failed', message: 'Column not found in the uploaded file.' };
        });

        if (!statusColumnFound && !availableColumns.includes(String(propColumnConfig.dateClosed))) {
            const statusValidation = currentValidationResults.find(r => r.column.startsWith('Status'));
            if(statusValidation) {
              statusValidation.status = 'Failed';
              statusValidation.message = `Column not found, and the fallback 'Date Closed' column (expected '${propColumnConfig.dateClosed}') was also not found. One of them is required.`;
            }
        }

        setValidationResults(currentValidationResults);

        const missingColumns = currentValidationResults.filter(r => r.status === 'Failed').map(r => r.column);

        if (missingColumns.length > 0) {
           throw new Error(`The uploaded file is missing required columns. Please check the validation details below.`);
        }
        
        const typedData: CashFlowItem[] = [];
        const totalRows = json.length;
        const chunkSize = 50; 

        setProgressMessage(`Processing ${totalRows} rows...`);
        await sleep(10);

        for (let i = 0; i < totalRows; i++) {
          const row = json[i];
          const typeValue = row[propColumnConfig.type];
          
          let dueDate = parseDate(row[propColumnConfig.dueDate]);
          let remainingAmount = parseAmount(row[propColumnConfig.remainingAmount]);
          let statusValue = row[propColumnConfig.status];
          const dateClosed = parseDate(row[propColumnConfig.dateClosed]);
          
          const installmentNumber = row[propColumnConfig.installmentNumber];

          if(installmentNumber !== null && installmentNumber !== undefined && String(installmentNumber).trim() !== '') {
            const installmentDueDate = parseDate(row[propColumnConfig.installmentDueDate]);
            const installmentAmount = parseAmount(row[propColumnConfig.installmentAmount]);
            const installmentStatus = row[propColumnConfig.installmentStatus];

            if(installmentDueDate) {
              dueDate = installmentDueDate;
            }
            if(installmentAmount !== null && installmentAmount > 0) {
              remainingAmount = installmentAmount;
            }
            if(installmentStatus !== null && installmentStatus !== undefined) {
              statusValue = installmentStatus;
            }
          }

          if (!statusValue) {
              if (dateClosed) {
                  statusValue = 'Paid';
              } else {
                  statusValue = 'Unpaid';
              }
          } else if (typeValue === 'Bill Credit' && !statusValue) {
             if (dateClosed) {
                statusValue = 'Fully Applied';
             } else {
                statusValue = 'Open';
             }
          }

          const transactionDate = parseDate(row[propColumnConfig.date]);
          
          if (!dueDate) {
            dueDate = transactionDate;
          }
          
          const amount = parseAmount(row[propColumnConfig.amount]);

          if (dueDate === null) {
            throw new Error(`Invalid or unreadable date in row ${i + 2}. Neither '${propColumnConfig.dueDate}' nor fallback '${propColumnConfig.date}' contain a valid date.`);
          }
          if(amount === null){
            throw new Error(`Invalid number format in row ${i + 2} for column '${propColumnConfig.amount}'.`);
          }
          if(remainingAmount === null){
            throw new Error(`Invalid number format in row ${i + 2} for column '${propColumnConfig.remainingAmount}'.`);
          }
          if(!VALID_TYPES.includes(typeValue)){
            throw new Error(`Invalid value in row ${i + 2} for column '${propColumnConfig.type}'. Must be one of: ${VALID_TYPES.join(', ')}.`);
          }
          
          typedData.push({
              'Type': typeValue,
              'Document Number': row[propColumnConfig.documentNumber],
              'Name': row[propColumnConfig.name],
              'Due Date': dueDate,
              'Amount': Math.abs(amount),
              'RemainingAmount': Math.abs(remainingAmount),
              'Status': statusValue,
              'Date': transactionDate,
              'Date Closed': dateClosed,
              'Installment Number': installmentNumber,
              'Installment Status': statusValue,
          });

          if ((i + 1) % chunkSize === 0 || i === totalRows - 1) {
            const currentProgress = Math.round(((i + 1) / totalRows) * 100);
            setProgress(currentProgress);
            setProgressMessage(`Processing ${i + 1} of ${totalRows} rows...`);
            await sleep(1);
          }
        }
        
        setProgress(100);
        setProgressMessage('Import Complete!');
        await sleep(500);

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
        } else if (! (error instanceof Error && error.message.startsWith('The uploaded file'))) {
            setValidationResults(null);
        }
      } finally {
        setLoading(false);
        setProgress(0);
        setProgressMessage('');
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
              <span className="text-sm text-muted-foreground">XLSX, XLS, CSV, JSON</span>
            </div>
          </div>
        </Label>
        <Input
          id="file-upload"
          type="file"
          ref={inputRef}
          className="hidden"
          onChange={handleFileChange}
          accept=".xlsx, .xls, .csv, .json"
          disabled={loading}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Processing...
            </>
          ) : "Browse Files"}
        </Button>
      </div>

       {loading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{progressMessage}</p>
        </div>
      )}

      {validationResults && !loading && (
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-base mb-2">File Validation Summary</h4>
            {validationResults.map((result, index) => (
              <div key={index} className="flex items-start gap-3">
                <div>
                  {result.status === 'Passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : result.status === 'Optional' ? (
                    <CheckCircle className="w-5 h-5 text-muted-foreground/50 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn("font-medium", result.status === 'Failed' && "text-destructive", result.status === 'Optional' && 'text-muted-foreground')}>
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
