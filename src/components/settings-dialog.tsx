"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnConfig } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect } from "react";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentConfig: ColumnConfig;
  onSave: (newConfig: ColumnConfig) => void;
}

const formSchema = z.object({
  type: z.string().min(1, "Column name cannot be empty."),
  documentNumber: z.string().min(1, "Column name cannot be empty."),
  name: z.string().min(1, "Column name cannot be empty."),
  dueDate: z.string().min(1, "Column name cannot be empty."),
  amount: z.string().min(1, "Column name cannot be empty."),
  dateFormat: z.string(),
});

export function SettingsDialog({ isOpen, onOpenChange, currentConfig, onSave }: SettingsDialogProps) {
  const form = useForm<ColumnConfig>({
    resolver: zodResolver(formSchema),
    defaultValues: currentConfig,
  });
  
  useEffect(() => {
    form.reset(currentConfig);
  }, [currentConfig, form]);

  const onSubmit = (values: ColumnConfig) => {
    onSave(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>File Upload Settings</DialogTitle>
              <DialogDescription>
                Map the column names from your spreadsheet to the required fields.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Type Column</FormLabel>
                    <FormControl>
                      <Input {...field} className="col-span-3" />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Document # Column</FormLabel>
                    <FormControl>
                      <Input {...field} className="col-span-3" />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Name Column</FormLabel>
                    <FormControl>
                      <Input {...field} className="col-span-3" />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Due Date Column</FormLabel>
                    <FormControl>
                      <Input {...field} className="col-span-3" />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Amount Column</FormLabel>
                    <FormControl>
                      <Input {...field} className="col-span-3" />
                    </FormControl>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right">Date Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="col-span-3">
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
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
