
"use client";

import { useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ManualTransaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsContext } from "@/context/settings-context";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Database, GanttChartSquare, LayoutDashboard, Settings, BookOpen, Repeat, CalendarIcon, Trash2, PlusCircle, ArrowUpCircle, ArrowDownCircle, XCircle, CalendarDays, Download } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const manualTransactionSchema = z.object({
  name: z.string().min(1, { message: "Description is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  type: z.enum(["inflow", "outflow"], { required_error: "You need to select a transaction type." }),
  startDate: z.date({ required_error: "A start date is required." }),
  frequency: z.enum(["once", "weekly", "fortnightly", "monthly", "quarterly"]),
});


export default function ManualTransactionsPage() {
  const { manualTransactions, setManualTransactions } = useContext(SettingsContext);
  const { toast } = useToast();

  const manualTransactionForm = useForm<z.infer<typeof manualTransactionSchema>>({
    resolver: zodResolver(manualTransactionSchema),
    defaultValues: {
      name: "",
      amount: 0,
      frequency: "once",
    },
  });

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
              <SidebarMenuButton asChild isActive>
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
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/export">
                  <Download />
                  <span>Export</span>
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
                <h1 className="text-3xl font-bold font-headline text-foreground">Manual Transactions</h1>
                <SidebarTrigger />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Repeat className="w-6 h-6" />Add & Manage Transactions</CardTitle>
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
        </main>
      </SidebarInset>
    </>
  );
}
