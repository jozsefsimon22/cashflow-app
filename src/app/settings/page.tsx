
"use client";

import { useContext, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnConfig, ManualTransaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsContext } from "@/context/settings-context";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Database, GanttChartSquare, LayoutDashboard, Settings as SettingsIcon, BookOpen, Wallet, Repeat, CalendarIcon, Trash2, PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const columnFormSchema = z.object({
  type: z.string().min(1, "Column name cannot be empty."),
  documentNumber: z.string().min(1, "Column name cannot be empty."),
  name: z.string().min(1, "Column name cannot be empty."),
  dueDate: z.string().min(1, "Column name cannot be empty."),
  amount: z.string().min(1, "Column name cannot be empty."),
  remainingAmount: z.string().min(1, "Column name cannot be empty."),
  status: z.string(),
  date: z.string().min(1, "Column name cannot be empty."),
  dateClosed: z.string(),
  dateFormat: z.string(),
});

const manualTransactionSchema = z.object({
  name: z.string().min(1, { message: "Description is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  type: z.enum(["inflow", "outflow"], { required_error: "You need to select a transaction type." }),
  startDate: z.date({ required_error: "A start date is required." }),
  frequency: z.enum(["once", "weekly", "fortnightly", "monthly", "quarterly"]),
});

type SettingField = {
  key: keyof ColumnConfig;
  label: string;
  description: string;
  isOptional?: boolean;
  isEditable: boolean;
  isSelect?: boolean;
};

const settingsFields: SettingField[] = [
  { key: 'type', label: 'Type', description: "Transaction category. Expected values: 'Invoice', 'Bill', 'Bill Credit', 'Credit Memo'.", isEditable: true },
  { key: 'documentNumber', label: 'Document Number', description: 'Unique ID for the transaction (e.g., invoice #).', isEditable: true },
  { key: 'name', label: 'Name', description: 'The name of the client or vendor.', isEditable: true },
  { key: 'dueDate', label: 'Due Date', description: 'The date the payment is due. Format should match selection below.', isEditable: true },
  { key: 'date', label: 'Date (Fallback)', description: "Transaction date. Used if 'Due Date' is empty.", isEditable: true },
  { key: 'amount', label: 'Amount (Original)', description: 'The total transaction amount.', isEditable: true },
  { key: 'remainingAmount', label: 'Remaining Amount', description: 'The open or outstanding balance of the transaction.', isEditable: true },
  { key: 'status', label: 'Status', description: "If missing, status is inferred from 'Date Closed'.", isOptional: true, isEditable: true },
  { key: 'dateClosed', label: 'Date Closed', description: "Used for status inference if 'Status' column is not found.", isOptional: true, isEditable: true },
  { key: 'dateFormat', label: 'Date Format', description: 'The date format used in your file.', isEditable: false, isSelect: true },
];


export default function SettingsPage() {
  const { columnConfig, setColumnConfig, startingBalance, setStartingBalance, manualTransactions, setManualTransactions } = useContext(SettingsContext);
  const { toast } = useToast();

  const columnForm = useForm<ColumnConfig>({
    resolver: zodResolver(columnFormSchema),
    defaultValues: {
      ...columnConfig,
      status: columnConfig.status ?? '',
      dateClosed: columnConfig.dateClosed ?? '',
      dateFormat: columnConfig.dateFormat ?? 'auto',
    },
  });

  const manualTransactionForm = useForm<z.infer<typeof manualTransactionSchema>>({
    resolver: zodResolver(manualTransactionSchema),
    defaultValues: {
      name: "",
      amount: 0,
      frequency: "once",
    },
  });

  useEffect(() => {
    columnForm.reset({
      ...columnConfig,
      status: columnConfig.status ?? '',
      dateClosed: columnConfig.dateClosed ?? '',
      dateFormat: columnConfig.dateFormat ?? 'auto',
    });
  }, [columnConfig, columnForm]);

  const onColumnSubmit = (values: ColumnConfig) => {
    setColumnConfig(values);
    toast({
      title: "Settings Saved",
      description: "Your column configuration has been updated.",
    });
  };
  
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numberValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numberValue)) {
      setStartingBalance(numberValue);
    }
  }

  const handleBalanceBlur = () => {
     toast({
      title: "Settings Saved",
      description: "Your starting balance has been updated.",
    });
  }

  const onManualTransactionSubmit = (values: z.infer<typeof manualTransactionSchema>) => {
    const newTransaction: ManualTransaction = {
      id: new Date().toISOString(), // simple unique id
      ...values,
    };
    setManualTransactions([...manualTransactions, newTransaction]);
    toast({
      title: "Transaction Added",
      description: "Your manual transaction has been added to the forecast.",
    });
    manualTransactionForm.reset({
      name: "",
      amount: 0,
      type: undefined,
      startDate: undefined,
      frequency: "once",
    });
  };

  const deleteManualTransaction = (id: string) => {
    setManualTransactions(manualTransactions.filter(t => t.id !== id));
    toast({
      title: "Transaction Removed",
      description: "The manual transaction has been removed from the forecast.",
    });
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
                <Link href="/data">
                  <Database />
                  <span>Imported Data</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href="/settings">
                  <SettingsIcon />
                  <span>Settings</span>
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
                <h1 className="text-3xl font-bold font-headline text-foreground">Settings</h1>
                <SidebarTrigger />
            </div>
            
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Forecast Settings</CardTitle>
                  <CardDescription>
                    Configure the starting point for your cash flow forecast.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-sm space-y-2">
                    <Label htmlFor="starting-balance">Current Bank Balance (£)</Label>
                    <div className="relative">
                       <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="starting-balance"
                          type="number"
                          placeholder="e.g., 5000"
                          value={startingBalance || ''}
                          onChange={handleBalanceChange}
                          onBlur={handleBalanceBlur}
                          className="pl-10"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This will be used as the starting point for the balance chart on the dashboard.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2"><Repeat className="w-6 h-6" />Manual Transactions</CardTitle>
                  <CardDescription>
                    Add one-off or recurring transactions to your forecast that are not in your imported file (e.g., rent, salaries).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...manualTransactionForm}>
                    <form onSubmit={manualTransactionForm.handleSubmit(onManualTransactionSubmit)} className="p-4 border rounded-lg bg-background space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField
                          control={manualTransactionForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="lg:col-span-3">
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Office Rent, Subscription" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                            control={manualTransactionForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount (£)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g., 1200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        <FormField
                            control={manualTransactionForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Type</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                  >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="inflow" />
                                      </FormControl>
                                      <FormLabel className="font-normal">Inflow</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem value="outflow" />
                                      </FormControl>
                                      <FormLabel className="font-normal">Outflow</FormLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={manualTransactionForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>First Due Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={manualTransactionForm.control}
                            name="frequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="once">Once</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit"><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</Button>
                      </div>
                    </form>
                  </Form>
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-2">Your Manual Transactions</h4>
                    <div className="border rounded-lg max-h-60 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>First Due</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manualTransactions.length > 0 ? manualTransactions.map(t => (
                              <TableRow key={t.id}>
                                <TableCell>{t.name}</TableCell>
                                <TableCell>£{t.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span className={cn("inline-flex items-center gap-1.5 capitalize", t.type === 'inflow' ? 'text-primary' : 'text-destructive')}>
                                    {t.type === 'inflow' ? <ArrowUpCircle className="w-4 h-4"/> : <ArrowDownCircle className="w-4 h-4" />}
                                    {t.type}
                                  </span>
                                </TableCell>
                                <TableCell>{format(t.startDate, "dd/MM/yyyy")}</TableCell>
                                <TableCell className="capitalize">{t.frequency}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => deleteManualTransaction(t.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )) : (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                  No manual transactions added yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>File Column Mapping</CardTitle>
                  <CardDescription>
                    Map the column names from your spreadsheet to the required fields. This ensures your data is parsed correctly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...columnForm}>
                    <form onSubmit={columnForm.handleSubmit(onColumnSubmit)}>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[240px]">Required Field</TableHead>
                              <TableHead>Your Column Name</TableHead>
                              <TableHead className="w-[45%]">Description & Format</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {settingsFields.map((field) => (
                              <TableRow key={field.key}>
                                <TableCell className="font-medium align-top pt-5">
                                  <div className="flex items-center gap-2">
                                      <span>{field.label}</span>
                                      {field.isOptional && <Badge variant="outline">Optional</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={columnForm.control}
                                    name={field.key}
                                    render={({ field: formField }) => (
                                      <FormItem>
                                        <FormControl>
                                          {field.isSelect ? (
                                            <Select onValueChange={formField.onChange} value={formField.value || 'auto'}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a date format" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="auto">Auto-detect</SelectItem>
                                                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                                                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                                                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                                                <SelectItem value="MM-dd-yyyy">MM-DD-YYYY</SelectItem>
                                                <SelectItem value="dd-MM-yyyy">DD-MM-YYYY</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <Input {...formField} placeholder={`e.g., '${columnConfig[field.key]}'`} />
                                          )}
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="text-muted-foreground align-top pt-5">
                                  {field.description}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                          <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
        </main>
      </SidebarInset>
    </>
  );
}
