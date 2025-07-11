
"use client";

import { createContext, useState, useEffect, ReactNode } from 'react';
import type { CashFlowItem, ColumnConfig } from '@/types';

interface SettingsContextType {
  columnConfig: ColumnConfig;
  setColumnConfig: (config: ColumnConfig) => void;
  data: CashFlowItem[] | null;
  setData: (data: CashFlowItem[] | null) => void;
  startingBalance: number;
  setStartingBalance: (balance: number) => void;
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
};

export const SettingsContext = createContext<SettingsContextType>({
  columnConfig: defaultConfig,
  setColumnConfig: () => {},
  data: null,
  setData: () => {},
  startingBalance: 0,
  setStartingBalance: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [columnConfig, setColumnConfigState] = useState<ColumnConfig>(defaultConfig);
  const [data, setDataState] = useState<CashFlowItem[] | null>(null);
  const [startingBalance, setStartingBalanceState] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load config from localStorage on initial client-side mount
    try {
      const savedConfig = localStorage.getItem('columnConfig');
      if (savedConfig) {
        setColumnConfigState({ ...defaultConfig, ...JSON.parse(savedConfig) });
      }
      const savedBalance = localStorage.getItem('startingBalance');
      if (savedBalance) {
        setStartingBalanceState(parseFloat(savedBalance));
      }
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
    }

    // Load data from sessionStorage on initial client-side mount
    try {
      const savedData = sessionStorage.getItem('cashFlowData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Correctly parse date strings back into Date objects
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
  
  const providerValue = {
    columnConfig,
    setColumnConfig,
    data: isInitialized ? data : null,
    setData,
    startingBalance,
    setStartingBalance,
  };

  return (
    <SettingsContext.Provider value={providerValue}>
      {children}
    </SettingsContext.Provider>
  );
};
