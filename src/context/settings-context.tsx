
"use client";

import { createContext, useState, useEffect, ReactNode } from 'react';
import type { CashFlowItem, ColumnConfig, ManualTransaction, ManualTransactionOccurrence } from '@/types';

interface SettingsContextType {
  columnConfig: ColumnConfig;
  setColumnConfig: (config: ColumnConfig) => void;
  data: CashFlowItem[] | null;
  setData: (data: CashFlowItem[] | null) => void;
  startingBalance: number;
  setStartingBalance: (balance: number) => void;
  manualTransactions: ManualTransaction[];
  setManualTransactions: (transactions: ManualTransaction[]) => void;
  paidManualOccurrences: ManualTransactionOccurrence[];
  setPaidManualOccurrences: (occurrences: ManualTransactionOccurrence[]) => void;
  excludedNames: string[];
  setExcludedNames: (names: string[]) => void;
}

const defaultConfig: ColumnConfig = {
  type: 'Type',
  documentNumber: 'Document Number',
  name: 'Name',
  dueDate: 'Due Date',
  amount: 'Amount',
  remainingAmount: 'Remaining Amount',
  status: 'Status',
  date: 'Date',
  dateClosed: 'Date Closed',
  dateFormat: 'auto',
  installmentDueDate: 'Installment Due Date',
  installmentAmount: 'Installment Amount',
  installmentNumber: 'Installment Number',
  installmentStatus: 'Installment Status',
};

export const SettingsContext = createContext<SettingsContextType>({
  columnConfig: defaultConfig,
  setColumnConfig: () => {},
  data: null,
  setData: () => {},
  startingBalance: 0,
  setStartingBalance: () => {},
  manualTransactions: [],
  setManualTransactions: () => {},
  paidManualOccurrences: [],
  setPaidManualOccurrences: () => {},
  excludedNames: [],
  setExcludedNames: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [columnConfig, setColumnConfigState] = useState<ColumnConfig>(defaultConfig);
  const [data, setDataState] = useState<CashFlowItem[] | null>(null);
  const [startingBalance, setStartingBalanceState] = useState<number>(0);
  const [manualTransactions, setManualTransactionsState] = useState<ManualTransaction[]>([]);
  const [paidManualOccurrences, setPaidManualOccurrencesState] = useState<ManualTransactionOccurrence[]>([]);
  const [excludedNames, setExcludedNamesState] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('columnConfig');
      if (savedConfig) {
        setColumnConfigState({ ...defaultConfig, ...JSON.parse(savedConfig) });
      }
      const savedBalance = localStorage.getItem('startingBalance');
      if (savedBalance) {
        setStartingBalanceState(parseFloat(savedBalance));
      }
      const savedManualTransactions = localStorage.getItem('manualTransactions');
      if(savedManualTransactions) {
        const parsed = JSON.parse(savedManualTransactions);
        const transactionsWithDates = parsed.map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
        }));
        setManualTransactionsState(transactionsWithDates);
      }
      const savedPaidOccurrences = localStorage.getItem('paidManualOccurrences');
      if(savedPaidOccurrences) {
          const parsed = JSON.parse(savedPaidOccurrences);
          const occurrencesWithDates = parsed.map((o: any) => ({
              ...o,
              dueDate: new Date(o.dueDate)
          }));
          setPaidManualOccurrencesState(occurrencesWithDates);
      }
      const savedExcludedNames = localStorage.getItem('excludedNames');
      if (savedExcludedNames) {
        setExcludedNamesState(JSON.parse(savedExcludedNames));
      }
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
    }

    try {
      const savedData = sessionStorage.getItem('cashFlowData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const dataWithDates = parsedData.map((item: any) => ({
          ...item,
          'Due Date': item['Due Date'] ? new Date(item['Due Date']) : null,
          'Date': item['Date'] ? new Date(item['Date']) : null,
          'Date Closed': item['Date Closed'] ? new Date(item['Date Closed']) : null,
        }));
        setDataState(dataWithDates);
      }
    } catch (error) {
      console.error("Failed to parse cashFlowData from sessionStorage", error);
    }
    
    setIsInitialized(true);
  }, []);

  const setColumnConfig = (newConfig: ColumnConfig) => {
    setColumnConfigState(newConfig);
    if(typeof window !== 'undefined'){
      try {
        localStorage.setItem('columnConfig', JSON.stringify(newConfig));
      } catch (error) {
        console.error("Failed to save columnConfig to localStorage", error);
      }
    }
  };

  const setStartingBalance = (newBalance: number) => {
    setStartingBalanceState(newBalance);
     if(typeof window !== 'undefined'){
      try {
        localStorage.setItem('startingBalance', String(newBalance));
      } catch (error) {
        console.error("Failed to save startingBalance to localStorage", error);
      }
    }
  }

  const setData = (newData: CashFlowItem[] | null) => {
    setDataState(newData);
    if(typeof window !== 'undefined'){
      try {
        if (newData) {
          sessionStorage.setItem('cashFlowData', JSON.stringify(newData));
        } else {
          sessionStorage.removeItem('cashFlowData');
        }
      } catch (error) {
        console.error("Failed to save cashFlowData to sessionStorage", error);
      }
    }
  };
  
  const setManualTransactions = (newTransactions: ManualTransaction[]) => {
    setManualTransactionsState(newTransactions);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('manualTransactions', JSON.stringify(newTransactions));
      } catch (error) {
        console.error("Failed to save manual transactions to localStorage", error);
      }
    }
  };

  const setPaidManualOccurrences = (occurrences: ManualTransactionOccurrence[]) => {
    setPaidManualOccurrencesState(occurrences);
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('paidManualOccurrences', JSON.stringify(occurrences));
        } catch (error) {
            console.error("Failed to save paid manual occurrences to localStorage", error);
        }
    }
  };

  const setExcludedNames = (names: string[]) => {
    setExcludedNamesState(names);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('excludedNames', JSON.stringify(names));
      } catch (error) {
        console.error("Failed to save excluded names to localStorage", error);
      }
    }
  };
  
  const providerValue = {
    columnConfig,
    setColumnConfig,
    data: isInitialized ? data : null,
    setData,
    startingBalance,
    setStartingBalance,
    manualTransactions,
    setManualTransactions,
    paidManualOccurrences,
    setPaidManualOccurrences,
    excludedNames,
    setExcludedNames,
  };

  return (
    <SettingsContext.Provider value={providerValue}>
      {children}
    </SettingsContext.Provider>
  );
};
