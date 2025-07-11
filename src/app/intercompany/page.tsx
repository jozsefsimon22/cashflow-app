
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
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { Users, Trash2, Search, PlusCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function IntercompanyPage() {
  const { data, intercompanyNames, setIntercompanyNames } = useContext(SettingsContext);
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
    const newIntercompanyNames = new Set(intercompanyNames);
    if (checked) {
      newIntercompanyNames.add(name);
    } else {
      newIntercompanyNames.delete(name);
    }
    setIntercompanyNames(Array.from(newIntercompanyNames));
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
    const newIntercompanyNames = new Set(intercompanyNames);
    if (newIntercompanyNames.has(manualName.trim())) {
        toast({
            variant: "destructive",
            title: "Already Exists",
            description: "This name is already in the intercompany list.",
        });
        return;
    }

    newIntercompanyNames.add(manualName.trim());
    setIntercompanyNames(Array.from(newIntercompanyNames));
    setManualName("");
     toast({
      title: "Name Added",
      description: `"${manualName.trim()}" has been added to the intercompany list.`,
    });
  };
  
  const handleRemoveName = (nameToRemove: string) => {
    setIntercompanyNames(intercompanyNames.filter(name => name !== nameToRemove));
     toast({
      title: "Name Removed",
      description: `"${nameToRemove}" has been removed from the intercompany list.`,
    });
  };


  return (
    <>
      <AppSidebar activePage="intercompany" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold font-headline text-foreground">Intercompany Names</h1>
            <SidebarTrigger />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Users className="w-6 h-6" />
                Manage Intercompany Names
              </CardTitle>
              <CardDescription>
                Select names from your imported data to tag them as "Intercompany". You can also add names manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4">Tag Names from Your Data</h3>
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
                    <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                      {filteredNames.length > 0 ? (
                        filteredNames.map(name => (
                          <div key={name} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={name}
                              checked={intercompanyNames.includes(name)}
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
                            placeholder="Enter a name to tag"
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
                  <h3 className="font-semibold text-lg mb-4">Currently Tagged as Intercompany</h3>
                  <ScrollArea className="h-[calc(60vh-6rem)] w-full rounded-md border">
                    {intercompanyNames.length > 0 ? (
                        <div className="p-4">
                            {intercompanyNames.map(name => (
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
                            <p className="text-sm text-muted-foreground">No names are tagged as Intercompany.</p>
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
