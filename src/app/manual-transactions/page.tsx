
"use client";

import { useContext, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Repeat, CalendarIcon, Trash2, PlusCircle, ArrowUpCircle, ArrowDownCircle, Pencil, History } from 'lucide-react';
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const manualTransactionSchema = z.object({
  name: z.string().min(1, { message: "Description is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  type: z.enum(["inflow", "outflow"], { required_error: "You need to select a transaction type." }),
  startDate: z.date({ required_error: "A start date is required." }),
  frequency: z.enum(["once", "weekly", "fortnightly", "monthly", "quarterly"]),
  pastDueHandling: z.enum(['auto-paid', 'manual']).optional(),
  endCondition: z.enum(['never', 'date', 'occurrences']),
  endDate: z.date().optional(),
  occurrences: z.coerce.number().optional(),
}).refine(data => {
    if (data.frequency !== 'once' && !data.pastDueHandling) {
        return false;
    }
    return true;
}, {
    message: "You must select a handling method for past due recurring items.",
    path: ["pastDueHandling"],
}).refine(data => {
    if (data.frequency !== 'once' && data.endCondition === 'date' && !data.endDate) {
        return false;
    }
    return true;
}, {
    message: "End date is required.",
    path: ["endDate"],
}).refine(data => {
    if (data.frequency !== 'once' && data.endCondition === 'occurrences' && (!data.occurrences || data.occurrences <= 0)) {
        return false;
    }
    return true;
}, {
    message: "Number of occurrences must be positive.",
    path: ["occurrences"],
});


export default function ManualTransactionsPage() {
  const { manualTransactions, setManualTransactions } = useContext(SettingsContext);
  const { toast } = useToast();
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const manualTransactionForm = useForm<z.infer<typeof manualTransactionSchema>>({
    resolver: zodResolver(manualTransactionSchema),
    defaultValues: {
      name: "",
      amount: 0,
      frequency: "once",
      pastDueHandling: 'auto-paid',
      endCondition: 'never',
      occurrences: undefined,
    },
  });
  
  const watchedFrequency = useWatch({
    control: manualTransactionForm.control,
    name: 'frequency',
  });
  
  const watchedEndCondition = useWatch({
    control: manualTransactionForm.control,
    name: 'endCondition',
  });

  const resetForm = () => {
    manualTransactionForm.reset({
      name: "",
      amount: 0,
      type: undefined,
      startDate: undefined,
      frequency: "once",
      pastDueHandling: 'auto-paid',
      endCondition: 'never',
      endDate: undefined,
      occurrences: undefined,
    });
    setEditingTransactionId(null);
  }

  const onManualTransactionSubmit = (values: z.infer<typeof manualTransactionSchema>) => {
    const finalValues: Partial<ManualTransaction> = { ...values };
    
    if (values.frequency === 'once') {
        delete finalValues.pastDueHandling;
        finalValues.endCondition = 'never';
        delete finalValues.endDate;
        delete finalValues.occurrences;
    } else {
       if (values.endCondition === 'never') {
          delete finalValues.endDate;
          delete finalValues.occurrences;
       } else if (values.endCondition === 'date') {
          delete finalValues.occurrences;
       } else if (values.endCondition === 'occurrences') {
          delete finalValues.endDate;
       }
    }


    if (editingTransactionId) {
      setManualTransactions(
        manualTransactions.map(t =>
          t.id === editingTransactionId ? { ...t, ...finalValues } as ManualTransaction : t
        )
      );
      toast({
        title: "Transaction Updated",
        description: "Your manual transaction has been successfully updated.",
      });
    } else {
      const newTransaction: ManualTransaction = {
        id: new Date().toISOString(),
        ...finalValues as Omit<ManualTransaction, 'id'>,
      };
      setManualTransactions([...manualTransactions, newTransaction]);
      toast({
        title: "Transaction Added",
        description: "Your manual transaction has been added to the forecast.",
      });
    }

    resetForm();
  };
  
  const handleEditClick = (transaction: ManualTransaction) => {
    setEditingTransactionId(transaction.id);
    manualTransactionForm.reset({
      ...transaction,
      pastDueHandling: transaction.pastDueHandling || 'auto-paid',
      endCondition: transaction.endCondition || 'never',
    });
  };
  
  const handleCancelEdit = () => {
    resetForm();
  };

  const deleteManualTransaction = (id: string) => {
    setManualTransactions(manualTransactions.filter(t => t.id !== id));
    toast({
      title: "Transaction Removed",
      description: "The manual transaction has been removed from the forecast.",
    });
    if(id === editingTransactionId) {
        handleCancelEdit();
    }
  };

  return (
    <>
      <AppSidebar activePage="manual-transactions" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold font-headline text-foreground">Manual Transactions</h1>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Repeat className="w-6 h-6" />{editingTransactionId ? 'Edit Transaction' : 'Add Transaction'}</CardTitle>
                    <CardDescription>
                    {editingTransactionId ? 'Update the details of your transaction.' : 'Add one-off or recurring transactions to your forecast that are not in your imported file (e.g., rent, salaries).'}
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
                            <FormItem className="md:col-span-2 lg:col-span-3">
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
                                    value={field.value}
                                    className="flex items-center space-x-4 pt-2"
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
                            name="frequency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                        </div>
                        {watchedFrequency !== 'once' && (
                          <div className="space-y-6">
                            <FormField
                                control={manualTransactionForm.control}
                                name="pastDueHandling"
                                render={({ field }) => (
                                    <FormItem className="space-y-3 pt-2">
                                    <FormLabel>How should past due recurrences be handled?</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex items-center space-x-4 pt-2"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="auto-paid" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Automatically mark as paid</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="manual" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Show as overdue until manually marked</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={manualTransactionForm.control}
                                name="endCondition"
                                render={({ field }) => (
                                    <FormItem className="space-y-3 pt-2">
                                        <FormLabel>When does this transaction end?</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="never" /></FormControl>
                                                    <FormLabel className="font-normal">Never</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="date" /></FormControl>
                                                    <FormLabel className="font-normal">On a specific date</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="occurrences" /></FormControl>
                                                    <FormLabel className="font-normal">After a number of occurrences</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            {watchedEndCondition === 'date' && (
                                <FormField
                                    control={manualTransactionForm.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col max-w-xs">
                                            <FormLabel>End Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            {watchedEndCondition === 'occurrences' && (
                                <FormField
                                    control={manualTransactionForm.control}
                                    name="occurrences"
                                    render={({ field }) => (
                                        <FormItem className="max-w-xs">
                                            <FormLabel>Number of Occurrences</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 12" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                           {editingTransactionId && (
                            <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                           )}
                           <Button type="submit">
                                {editingTransactionId ? "Update Transaction" : <><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</>}
                           </Button>
                        </div>
                    </form>
                    </Form>
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-md font-medium">Your Manual Transactions</h4>
                            <Button variant="outline" asChild>
                                <Link href="/recurring-history">
                                    <History className="mr-2 h-4 w-4" />
                                    View Recurring History
                                </Link>
                            </Button>
                        </div>
                    <div className="border rounded-lg max-h-[50vh] overflow-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>First Due</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Ends</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {manualTransactions.length > 0 ? manualTransactions.map(t => (
                                <TableRow key={t.id} className={cn(editingTransactionId === t.id && 'bg-primary/10')}>
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
                                <TableCell>
                                  {t.frequency === 'once' ? 'N/A' :
                                    t.endCondition === 'never' ? 'Never' :
                                    t.endCondition === 'date' && t.endDate ? `On ${format(t.endDate, "dd/MM/yy")}` :
                                    t.endCondition === 'occurrences' ? `After ${t.occurrences} times` :
                                    'Never'
                                  }
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(t)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => deleteManualTransaction(t.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
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
