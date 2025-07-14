
"use client";

import { useContext, useState, useMemo, useEffect } from "react";
import Link from 'next/link';
import { SettingsContext } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { Link2, Trash2, Search, Wand2, PlusCircle, ArrowRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NamePair } from '@/types';
import { Badge } from "@/components/ui/badge";

export default function NamePairingPage() {
  const { data, namePairings, setNamePairings } = useContext(SettingsContext);
  const { toast } = useToast();

  const [receivableSearch, setReceivableSearch] = useState("");
  const [payableSearch, setPayableSearch] = useState("");
  
  const [selectedReceivable, setSelectedReceivable] = useState<string | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<string | null>(null);

  const [suggestedPairs, setSuggestedPairs] = useState<NamePair[]>([]);

  const { receivableNames, payableNames } = useMemo(() => {
    if (!data) return { receivableNames: [], payableNames: [] };
    
    const pairedReceivables = new Set(namePairings.map(p => p.receivableName));
    const pairedPayables = new Set(namePairings.map(p => p.payableName));
    
    const receivables = new Set<string>();
    const payables = new Set<string>();

    data.forEach(item => {
      if (!item.Name) return;
      if (['Invoice', 'Credit Memo'].includes(item.Type)) {
        if (!pairedReceivables.has(item.Name)) receivables.add(item.Name);
      } else if (['Bill', 'Bill Credit'].includes(item.Type)) {
        if (!pairedPayables.has(item.Name)) payables.add(item.Name);
      }
    });

    return { 
      receivableNames: Array.from(receivables).sort(),
      payableNames: Array.from(payables).sort()
    };
  }, [data, namePairings]);
  
  const filteredReceivableNames = useMemo(() => {
      return receivableNames.filter(name => name.toLowerCase().includes(receivableSearch.toLowerCase()));
  }, [receivableNames, receivableSearch]);

  const filteredPayableNames = useMemo(() => {
      return payableNames.filter(name => name.toLowerCase().includes(payableSearch.toLowerCase()));
  }, [payableNames, payableSearch]);


  const handleAutoSuggest = () => {
    const prefixRegex = /^CUS\d{0,5}\s+/i;
    const suggestions: NamePair[] = [];

    receivableNames.forEach(rName => {
        const cleanRName = rName.replace(prefixRegex, '').toLowerCase();
        const matchingPName = payableNames.find(pName => pName.toLowerCase() === cleanRName);
        if(matchingPName) {
            suggestions.push({ receivableName: rName, payableName: matchingPName });
        }
    });

    setSuggestedPairs(suggestions);

    if(suggestions.length > 0) {
        toast({
            title: "Suggestions Found",
            description: `Found ${suggestions.length} potential name pairings. Review them below.`
        });
    } else {
        toast({
            title: "No Suggestions Found",
            description: "No automatic pairings could be identified."
        });
    }
  };

  const handleAddPair = (pair: NamePair) => {
    setNamePairings([...namePairings, pair]);
    toast({
        title: "Pair Added",
        description: `"${pair.receivableName}" is now paired with "${pair.payableName}".`
    });
    // Remove from suggested list
    setSuggestedPairs(suggestedPairs.filter(p => p.receivableName !== pair.receivableName));
    // Clear manual selection
    if (selectedReceivable === pair.receivableName || selectedPayable === pair.payableName) {
        setSelectedReceivable(null);
        setSelectedPayable(null);
    }
  };

  const handleRemovePair = (pairToRemove: NamePair) => {
    setNamePairings(namePairings.filter(p => p.receivableName !== pairToRemove.receivableName));
    toast({
        title: "Pair Removed",
        description: `Pairing for "${pairToRemove.receivableName}" has been removed.`
    });
  };

  useEffect(() => {
    if(selectedReceivable && selectedPayable) {
        handleAddPair({receivableName: selectedReceivable, payableName: selectedPayable});
    }
  }, [selectedReceivable, selectedPayable]);

  return (
    <>
      <AppSidebar activePage="name-pairing" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold font-headline text-foreground">Name Pairing</h1>
            </div>
          </div>
          
          <div className="space-y-8">
              <Card>
                  <CardHeader>
                      <CardTitle className="font-headline flex items-center gap-2">
                          <Link2 className="w-6 h-6" />
                          Pair Receivable and Payable Names
                      </CardTitle>
                      <CardDescription>
                          Match receivable names (e.g., customers) with their corresponding payable names (e.g., vendors) to consolidate their balance on the Balance Summary page.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                       <Button onClick={handleAutoSuggest} disabled={!data}>
                           <Wand2 className="mr-2 h-4 w-4"/>
                           Auto-Suggest Pairings
                       </Button>
                       {!data && <p className="text-sm text-muted-foreground mt-2">Import data to enable suggestions.</p>}
                  </CardContent>
              </Card>

             {suggestedPairs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Suggested Pairs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48 w-full rounded-md border p-4">
                           {suggestedPairs.map(pair => (
                               <div key={pair.receivableName} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                                   <div className="flex items-center gap-2 text-sm">
                                       <span>{pair.receivableName}</span>
                                       <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                                       <span>{pair.payableName}</span>
                                   </div>
                                   <Button size="sm" onClick={() => handleAddPair(pair)}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                               </div>
                           ))}
                        </ScrollArea>
                    </CardContent>
                </Card>
             )}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                       <CardTitle>Manual Pairing</CardTitle>
                       <CardDescription>Select one name from each list to create a pair.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <h3 className="font-semibold text-center">Receivable Names</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search..." value={receivableSearch} onChange={(e) => setReceivableSearch(e.target.value)} className="pl-10" />
                            </div>
                           <ScrollArea className="h-72 w-full rounded-md border p-2">
                               {filteredReceivableNames.length > 0 ? filteredReceivableNames.map(name => (
                                   <div key={name} onClick={() => setSelectedReceivable(name)} className={`p-2 rounded-md cursor-pointer text-sm ${selectedReceivable === name ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                                       {name}
                                   </div>
                               )) : <p className="text-sm text-center text-muted-foreground p-4">No names available.</p>}
                           </ScrollArea>
                        </div>
                        <div className="space-y-2">
                           <h3 className="font-semibold text-center">Payable Names</h3>
                           <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search..." value={payableSearch} onChange={(e) => setPayableSearch(e.target.value)} className="pl-10" />
                            </div>
                           <ScrollArea className="h-72 w-full rounded-md border p-2">
                                {filteredPayableNames.length > 0 ? filteredPayableNames.map(name => (
                                   <div key={name} onClick={() => setSelectedPayable(name)} className={`p-2 rounded-md cursor-pointer text-sm ${selectedPayable === name ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                                       {name}
                                   </div>
                               )) : <p className="text-sm text-center text-muted-foreground p-4">No names available.</p>}
                           </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                       <CardTitle>Current Pairs</CardTitle>
                       <CardDescription>These pairings are being used to consolidate balances.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[21.5rem] w-full rounded-md border">
                            {namePairings.length > 0 ? (
                                <div className="p-4 space-y-2">
                                    {namePairings.map(pair => (
                                        <div key={pair.receivableName} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                            <div className="flex items-center gap-2 text-sm flex-wrap">
                                                <Badge variant="outline" className="border-primary/50 text-primary">{pair.receivableName}</Badge>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                                <Badge variant="outline" className="border-destructive/50 text-destructive">{pair.payableName}</Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemovePair(pair)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground">No names have been paired yet.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
