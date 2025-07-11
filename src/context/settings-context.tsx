
"use client";

import { createContext, useState, useEffect, ReactNode } from 'react';
import type { CashFlowItem, ColumnConfig } from '@/types';

interface SettingsContextType {
  columnConfig: ColumnConfig;
  setColumnConfig: (config: ColumnConfig) => void;
  data: CashFlowItem[] | null;
  setData: (data: CashFlowItem[] | null) => void;
}

const defaultConfig: ColumnConfig = {
  type: 'Type',
  documentNumber: 'Document Number',
  name: 'Name',
  dueDate: 'Due Date',
  amount: 'Amount',
  status: 'Status',
  date: 'Date',
  dateFormat: 'auto',
};

export const SettingsContext = createContext<SettingsContextType>({
  columnConfig: defaultConfig,
  setColumnConfig: () => {},
  data: null,
  setData: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(() => {
    if (typeof window !== 'undefined') {
        try {
          const savedConfig = localStorage.getItem('columnConfig');
          return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
        } catch (error) {
          console.error("Failed to parse columnConfig from localStorage", error);
          return defaultConfig;
        }
    }
    return defaultConfig;
  });

  const [data, setData] = useState<CashFlowItem[] | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedData = sessionStorage.getItem('cashFlowData');
        if (savedData) {
          // Dates are stored as strings in JSON, so we need to convert them back to Date objects
          const parsedData = JSON.parse(savedData);
          return parsedData.map((item: any) => ({
            ...item,
            'Due Date': new Date(item['Due Date']),
          }));
        }
        return null;
      } catch (error) {
        console.error("Failed to parse cashFlowData from sessionStorage", error);
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('columnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.error("Failed to save columnConfig to localStorage", error);
    }
  }, [columnConfig]);

  useEffect(() => {
    try {
      if (data) {
        sessionStorage.setItem('cashFlowData', JSON.stringify(data));
      } else {
        sessionStorage.removeItem('cashFlowData');
      }
    } catch (error) {
      console.error("Failed to save cashFlowData to sessionStorage", error);
    }
  }, [data]);

  const handleSetData = (newData: CashFlowItem[] | null) => {
    setData(newData);
  };

  return (
    <SettingsContext.Provider value={{ columnConfig, setColumnConfig, data, setData: handleSetData }}>
      {children}
    </SettingsContext.Provider>
  );
};
