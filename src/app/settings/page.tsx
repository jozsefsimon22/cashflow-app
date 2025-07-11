
"use client";

import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsContext } from "@/context/settings-context";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Database, GanttChartSquare, LayoutDashboard, Settings as SettingsIcon, BookOpen, Wallet, Repeat, XCircle, CalendarDays } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const { columnConfig, setColumnConfig, startingBalance, setStartingBalance } = useContext(SettingsContext);
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
                <Link href="/weekly-view">
                  <CalendarDays />
                  <span>Weekly View</span>
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
              <SidebarMenuButton asChild>
                <Link href="/manual-transactions">
                  <Repeat />
                  <span>Manual Transactions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/exclusions">
                  <XCircle />
                  <span>Exclusions</span>
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
