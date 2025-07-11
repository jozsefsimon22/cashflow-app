
"use client";

import { useContext, useState, useMemo } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Settings, BookOpen, GanttChartSquare, Repeat, XCircle, Trash2, Search, PlusCircle, CalendarDays, Download, History } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ExclusionsPage() {
  const { data, excludedNames, setExcludedNames } = useContext(SettingsContext);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [manualName, setManualName] = useState("");

  const uniqueNames = useMemo(() => {
    if (!data) return [];
    const names = new Set(data.map(item => item.Name).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredNames = useMemo(() => {
    return uniqueNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [uniqueNames, searchTerm]);

  const handleCheckboxChange = (name: string, checked: boolean | 'indeterminate') => {
    const newExcludedNames = new Set(excludedNames);
    if (checked) {
      newExcludedNames.add(name);
    } else {
      newExcludedNames.delete(name);
    }
    setExcludedNames(Array.from(newExcludedNames));
  };
  
  const handleAddManualName = () => {
    if (manualName.trim() === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name cannot be empty.",
      });
      return;
    }
    const newExcludedNames = new Set(excludedNames);
    if (newExcludedNames.has(manualName.trim())) {
        toast({
            variant: "destructive",
            title: "Already Exists",
            description: "This name is already in the exclusion list.",
        });
        return;
    }

    newExcludedNames.add(manualName.trim());
    setExcludedNames(Array.from(newExcludedNames));
    setManualName("");
     toast({
      title: "Name Added",
      description: `"${manualName.trim()}" has been added to the exclusion list.`,
    });
  };
  
  const handleRemoveName = (nameToRemove: string) => {
    setExcludedNames(excludedNames.filter(name => name !== nameToRemove));
     toast({
      title: "Name Removed",
      description: `"${nameToRemove}" has been removed from the exclusion list.`,
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
              <SidebarMenuButton asChild>
                <Link href="/manual-transactions">
                  <Repeat />
                  <span>Manual Transactions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild>
                    <Link href="/recurring-history">
                        <History />
                        <span>Recurring History</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
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
            <h1 className="text-3xl font-bold font-headline text-foreground">Name Exclusions</h1>
            <SidebarTrigger />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <XCircle className="w-6 h-6" />
                Manage Excluded Names
              </CardTitle>
              <CardDescription>
                Select names from your imported data to exclude them from all forecast calculations on the dashboard. You can also add names manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Exclude Names from Your Data</h3>
                {data ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search names..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                      {filteredNames.length > 0 ? (
                        filteredNames.map(name => (
                          <div key={name} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={name}
                              checked={excludedNames.includes(name)}
                              onCheckedChange={(checked) => handleCheckboxChange(name, checked)}
                            />
                            <Label htmlFor={name} className="font-normal">{name}</Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center">No names found matching your search.</p>
                      )}
                    </ScrollArea>
                  </div>
                ) : (
                    <div className="flex items-center justify-center h-72 border rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">
                            Import data on the <Link href="/data" className="text-primary underline">Imported Data</Link> page to see available names.
                        </p>
                    </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-lg mb-4">Manually Add a Name</h3>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Enter a name to exclude"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddManualName();
                                }
                            }}
                        />
                        <Button onClick={handleAddManualName}><PlusCircle /> Add</Button>
                    </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-4">Currently Excluded</h3>
                  <ScrollArea className="h-60 w-full rounded-md border">
                    {excludedNames.length > 0 ? (
                        <div className="p-4">
                            {excludedNames.map(name => (
                                <div key={name} className="flex items-center justify-between mb-2 p-2 rounded-md bg-secondary">
                                    <span className="text-sm">{name}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveName(name)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground">No names are currently excluded.</p>
                        </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </>
  );
}
