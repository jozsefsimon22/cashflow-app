
"use client";

import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsContext } from "@/context/settings-context";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { ArrowLeft, Database, GanttChartSquare, LayoutDashboard, Settings as SettingsIcon, BookOpen } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";

const formSchema = z.object({
  type: z.string().min(1, "Column name cannot be empty."),
  documentNumber: z.string().min(1, "Column name cannot be empty."),
  name: z.string().min(1, "Column name cannot be empty."),
  dueDate: z.string().min(1, "Column name cannot be empty."),
  amount: z.string().min(1, "Column name cannot be empty."),
  status: z.string(),
  date: z.string().min(1, "Column name cannot be empty."),
  dateClosed: z.string(),
  dateFormat: z.string(),
});

export default function SettingsPage() {
  const { columnConfig, setColumnConfig } = useContext(SettingsContext);
  const { toast } = useToast();

  const form = useForm<ColumnConfig>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...columnConfig,
      status: columnConfig.status ?? '',
      dateClosed: columnConfig.dateClosed ?? '',
      dateFormat: columnConfig.dateFormat ?? 'auto',
    },
  });

  useEffect(() => {
    form.reset({
      ...columnConfig,
      status: columnConfig.status ?? '',
      dateClosed: columnConfig.dateClosed ?? '',
      dateFormat: columnConfig.dateFormat ?? 'auto',
    });
  }, [columnConfig, form]);

  const onSubmit = (values: ColumnConfig) => {
    setColumnConfig(values);
    toast({
      title: "Settings Saved",
      description: "Your column configuration has been updated.",
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
            
            <Card>
              <CardHeader>
                <CardTitle>File Upload Settings</CardTitle>
                <CardDescription>
                  Map the column names from your spreadsheet to the required fields. This ensures your data is parsed correctly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type Column</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Category'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="documentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document # Column</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Invoice No.'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name Column</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Client Name'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date Column</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Payment Due'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Column (Fallback)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Transaction Date'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Column</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Total'" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Column (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Payment Status'" />
                          </FormControl>
                           <FormDescription>
                            If not found, status will be inferred from the 'Date Closed' column.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateClosed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Closed Column (for Status inference)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 'Closed On'" />
                          </FormControl>
                           <FormDescription>
                            Used to determine status if the 'Status' column is not found.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a date format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="auto">Auto-detect</SelectItem>
                              <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                              <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                              <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                              <SelectItem value="MM-dd-yyyy">MM-DD-YYYY</SelectItem>
                              <SelectItem value="dd-MM-yyyy">DD-MM-YYYY</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
        </main>
      </SidebarInset>
    </>
  );
}
